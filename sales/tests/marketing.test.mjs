import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import express from "express";
import { openDatabase } from "../db/database.mjs";
import { upgradeMarketing } from "../db/migrations/006-marketing.mjs";
import { marketingRoutes, campaignMedia } from "../modules/marketing/routes.mjs";
import { marketingConfig } from "../modules/marketing/provider.mjs";

const flyer = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";

test("customer permissions, image campaigns, reviewed audience, durable outbox and uncertain delivery", async () => {
  const folder = mkdtempSync(path.join(os.tmpdir(),"rfy-marketing-test-"));
  const db = openDatabase(folder);
  upgradeMarketing(db); // Repeat upgrades must preserve records.
  const captured = [];
  let responseMode = 'ok';
  const provider = createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      captured.push({body:JSON.parse(body),authorization:req.headers.authorization});
      if(responseMode==='disconnect')return req.socket.destroy();
      res.setHeader('Content-Type','application/json');
      res.statusCode=responseMode==='reject'?400:responseMode==='error'?503:200;
      res.end(JSON.stringify(responseMode==='empty'?{success:true}:responseMode==='ok'?{success:true,id:'mock-'+captured.length}:{error:'mock failure'}));
    });
  });
  await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));
  const config=marketingConfig({NODE_ENV:'test',WAY2CHATS_API_KEY:'mock-key',WAY2CHATS_PHONE_ID:'mock-phone',WAY2CHATS_URL:`http://127.0.0.1:${provider.address().port}`,PUBLIC_ORIGIN:'http://127.0.0.1:1',BASE_PATH:'/sales'});
  const app=express(); app.use(express.json({limit:'3mb'})); campaignMedia(db,app);
  app.use('/api',(req,res,next)=>{if(req.headers['x-test-owner']!=='yes')return res.status(401).json({error:'Please sign in.'});req.sessionToken='test-owner';next();});
  const queue=marketingRoutes(db,app,{config,autoStart:false});
  app.use((err,req,res,next)=>res.status(err.status||500).json({error:err.message}));
  const parent=express();parent.use('/sales',app);
  const server=parent.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  config.origin=`http://127.0.0.1:${server.address().port}`;
  const base=config.origin+'/sales';
  const request=async(url,method='GET',body,owner=true)=>fetch(base+'/api'+url,{method,headers:{'Content-Type':'application/json',...(owner?{'X-Test-Owner':'yes'}:{})},body:body?JSON.stringify(body):undefined});
  const json=async(url,method='GET',body)=>{const response=await request(url,method,body);assert(response.ok,await response.clone().text());return response.json();};
  const customer=(name,phone,subscribed=true)=>({name,phone,subscribed,consentNote:subscribed?'Showroom signup, test only':'',notes:''});
  const draft=async(image=null)=>json('/campaigns','POST',{title:'Test campaign',message:'Test offer only.',image});
  const review=async id=>json('/campaigns/'+id+'/review','POST',{});
  const send=async(id,reviewHash,key=crypto.randomUUID())=>json('/campaigns/'+id+'/send','POST',{requestKey:key,reviewHash});
  try {
    assert.equal((await request('/customers','GET',null,false)).status,401);
    assert.equal((await request('/campaigns','GET',null,false)).status,401);
    const cfg=await json('/marketing/config');assert.equal(cfg.imageTemplate,'custom_broadcast_media');assert(!JSON.stringify(cfg).includes('mock-key'));
    assert.equal(marketingConfig({}).ready,false);
    assert.equal(marketingConfig({WAY2CHATS_API_KEY:'x',WAY2CHATS_PHONE_ID:'x',WAY2CHATS_URL:'http://example.com'}).ready,false);
    const alice=await json('/customers','POST',customer('Alice','9876543210'));
    const bob=await json('/customers','POST',customer('Bob','9876543211',false));
    assert.equal((await request('/customers','POST',customer('Duplicate','+91 98765 43210'))).status,409);
    assert.equal((await request('/customers','POST',customer('Invalid','1234'))).status,400);
    assert.equal((await request('/customers','POST',{...customer('No proof','9876543212'),consentNote:''})).status,400);
    const customers=await json('/customers'); assert.equal(customers[0].phone.startsWith('+91'),true);
    assert.equal((await request('/campaigns','POST',{title:'Bad image',message:'Test',image:'data:image/png;base64,SGVsbG8='})).status,400);
    assert.equal((await request('/campaigns','POST',{title:'Long message',message:'x'.repeat(901)})).status,400);
    const campaign=await draft(flyer);
    let preview=await review(campaign.id); assert.equal(preview.count,1);assert.equal(captured.length,0);
    const imageResponse=await fetch(base.replace('/sales','')+preview.campaign.imageUrl);assert.equal(imageResponse.status,200);assert.match(imageResponse.headers.get('content-type'),/image\/png/);
    assert.equal((await fetch(base+'/campaign-media/not-a-real-id')).status,404);
    assert.equal((await request('/campaigns/'+campaign.id+'/send','POST',{requestKey:crypto.randomUUID(),reviewHash:'stale'})).status,409);
    await json('/customers/'+alice.id,'PUT',{...customer('Alice','9876543210'),notes:'Changed after review'});
    assert.equal((await request('/campaigns/'+campaign.id+'/send','POST',{requestKey:crypto.randomUUID(),reviewHash:preview.reviewHash})).status,409);
    preview=await review(campaign.id);
    const key=crypto.randomUUID();await Promise.all([send(campaign.id,preview.reviewHash,key),send(campaign.id,preview.reviewHash,key)]);
    assert.equal((await request('/campaigns/'+campaign.id,'PUT',{title:'Changed',message:'Changed'})).status,409);
    assert.equal((await request('/campaigns/'+campaign.id+'/send','POST',{requestKey:crypto.randomUUID(),reviewHash:preview.reviewHash})).status,409);
    await queue.tick();await queue.tick();
    assert.equal(captured.length,1);
    assert.deepEqual(captured[0].body,{to:'919876543210',phoneNoId:'mock-phone',type:'template',name:'custom_broadcast_media',language:'en_GB',bodyParams:['Alice','Test offer only.'],headerParams:[{type:'image',url:config.origin+preview.campaign.imageUrl}]});
    assert.equal(captured[0].authorization,'Bearer mock-key');
    let result=await json('/campaigns/'+campaign.id);assert.equal(result.status,'completed');assert.equal(result.counts.accepted,1);assert.equal(result.recipients[0].provider_id,'mock-1');
    // A queued recipient who withdraws permission is skipped immediately before send.
    const skipped=await draft();await send(skipped.id,(await review(skipped.id)).reviewHash);
    await json('/customers/'+alice.id,'PUT',customer('Alice','9876543210',false));await queue.tick();
    result=await json('/campaigns/'+skipped.id);assert.equal(result.counts.skipped,1);assert.equal(captured.length,1);
    // Invoice imports never grant consent and do not duplicate existing numbers.
    db.prepare('INSERT INTO invoices(id,number,request_key,body,total,paid,created) VALUES(?,?,?,?,?,?,?)').run('invoice-test','TEST','test-key',JSON.stringify({customer:{name:'Invoice contact',phone:'9876543213'}}),1,0,new Date().toISOString());
    assert.equal((await json('/customers/import-invoices','POST',{})).imported,1);
    assert.equal((await json('/customers/import-invoices','POST',{})).imported,0);
    assert.equal((await json('/customers')).find(c=>c.phone==='+919876543213').subscribed,0);
    const empty=await draft();assert.equal((await request('/campaigns/'+empty.id+'/send','POST',{requestKey:crypto.randomUUID(),reviewHash:(await review(empty.id)).reviewHash})).status,400);
    await json('/customers/'+alice.id,'PUT',customer('Alice','9876543210'));
    assert.equal((await request('/customers/'+alice.id,'PUT',customer('Alice','9876543215'))).status,400);
    // Explicit rejection and ambiguous responses must not be labelled delivered or retried.
    for(const [mode,expected] of [['reject','failed'],['error','unknown'],['empty','unknown'],['disconnect','unknown']]){
      responseMode=mode;const next=await draft();await send(next.id,(await review(next.id)).reviewHash);await queue.tick();
      const count=captured.length;await queue.tick();assert.equal(captured.length,count);
      assert.equal((await json('/campaigns/'+next.id)).counts[expected],1);
    }
    responseMode='ok';
    await json('/customers/'+bob.id,'PUT',customer('Bob','9876543211'));
    const cancelled=await draft();await send(cancelled.id,(await review(cancelled.id)).reviewHash);
    await json('/campaigns/'+cancelled.id+'/cancel','POST',{});const before=captured.length;await queue.tick();assert.equal(captured.length,before);assert.equal((await json('/campaigns/'+cancelled.id)).counts.skipped,2);
    const noOrigin=await draft(flyer);config.mediaReady=false;
    assert.equal((await request('/campaigns/'+noOrigin.id+'/send','POST',{requestKey:crypto.randomUUID(),reviewHash:(await review(noOrigin.id)).reviewHash})).status,503);config.mediaReady=true;
    config.ready=false;
    assert.equal((await request('/campaigns/'+noOrigin.id+'/send','POST',{requestKey:crypto.randomUUID(),reviewHash:(await review(noOrigin.id)).reviewHash})).status,503);config.ready=true;
    const crashed=await draft();await send(crashed.id,(await review(crashed.id)).reviewHash);
    db.prepare("UPDATE marketing_recipients SET status='sending' WHERE campaign_id=?").run(crashed.id);
    queue.stop(); const resumed=marketingRoutes(db,express(),{config,autoStart:false});
    assert.equal(db.prepare("SELECT COUNT(*) n FROM marketing_recipients WHERE campaign_id=? AND status='unknown'").get(crashed.id).n,2);
    await resumed.tick();assert.equal(captured.length,before);resumed.stop();
    assert(db.prepare('SELECT COUNT(*) n FROM marketing_contact_events').get().n>=5);
  } finally {
    queue.stop(); await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>provider.close(resolve));db.close();
    rmSync(folder,{recursive:true,force:true});
  }
});
