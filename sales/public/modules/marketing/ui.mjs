import { esc, field, area, panel } from "../../shared/ui.mjs";

const labels = { pending: "Pending", sending: "Sending", accepted: "Accepted", failed: "Rejected", unknown: "Check provider", skipped: "Skipped" };
const dateLabel = (date) => new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
const preference = (customer) => `<span class="tag ${customer.subscribed ? '' : 'marketing-muted-tag'}">${customer.subscribed ? 'Subscribed' : 'Not subscribed'}</span>`;

export async function marketingScreen(ctx) {
  const { route, api, shell, heading, error, toast } = ctx;
  const current = () => location.hash.slice(1) === route;
  try {
    if (route.startsWith("customers")) {
      const customers = await api("/customers");
      if (!current()) return;
      const [, action, id] = route.split("/");
      if (action === "new" || action === "edit") {
        const customer = action === "edit" ? customers.find(c => c.id === id) : {};
        if (!customer) throw Error("Customer not found.");
        shell(heading("YOUR CUSTOMER BOOK", action === "edit" ? "Edit customer." : "A new connection.", "Keep contact details and promotion preferences together.", '<a href="#customers">← Customers</a>') +
          `<form class="panel" id="customer-form"><div class="panelbody"><div id="error" role="alert"></div><div class="formgrid">${field("Customer name *", "name", customer.name, 'required maxlength="150" autocomplete="name"')}${field("WhatsApp mobile number *", "phone", customer.phone, 'required type="tel" maxlength="20" autocomplete="tel" placeholder="+91 98765 43210"')}${area("Customer notes", "notes", customer.notes,1500)}</div><div class="marketing-permission"><label><input type="checkbox" id="subscribed" name="subscribed" ${customer.subscribed ? 'checked' : ''}> This customer has agreed to receive promotional messages.</label><p class="muted">Leave unchecked until the customer gives permission. Uncheck to stop future campaigns.</p>${field("Where / when permission was given", "consentNote", customer.consent_note, 'maxlength="500" placeholder="e.g. Showroom signup form, 15 Nov 2026"')}</div></div><div class="formfooter"><a href="#customers">Cancel</a><button class="primary">Save customer →</button></div></form>`,route);
        const form = document.querySelector("#customer-form");
        const syncConsent = () => { form.consentNote.required = form.subscribed.checked; };
        syncConsent();
        form.subscribed.onchange = syncConsent;
        form.phone.oninput = () => {
          if (customer.phone) { form.subscribed.checked = false; form.consentNote.value = ''; syncConsent(); }
        };
        form.onsubmit = async event => {
          event.preventDefault(); event.submitter.disabled = true;
          try {
            await api("/customers" + (customer.id ? "/"+customer.id : ""), customer.id ? "PUT" : "POST", {
              name: form.elements.name.value, phone: form.phone.value, notes: form.notes.value,
              subscribed: form.subscribed.checked, consentNote: form.consentNote.value,
            });
            toast("Customer saved."); location.hash = "customers";
          } catch (err) { error(err); event.submitter.disabled = false; }
        };
        return;
      }
      shell(heading("YOUR CUSTOMER BOOK", "Stay close to your customers.", "Save mobile numbers, manage preferences, and build your audience.", '<button id="import-customers">Import invoice contacts</button><a href="#customers/new"><button class="primary">+ Add customer</button></a>') +
        `<div class="stats marketing-stats"><div class="stat"><small>Customers</small><strong>${customers.length}</strong><em>One record per mobile number</em></div><div class="stat"><small>Ready for promotions</small><strong>${customers.filter(c=>c.subscribed).length}</strong><em>Permission recorded</em></div><div class="stat"><small>Not subscribed</small><strong>${customers.filter(c=>!c.subscribed).length}</strong><em>Excluded from campaigns</em></div></div><div class="search"><input id="customer-search" aria-label="Search customers" placeholder="Search name or mobile number…"></div><section class="panel"><div id="customer-table"></div></section>`,route);
      const draw = () => {
        const query = document.querySelector("#customer-search").value.toLowerCase();
        const rows = customers.filter(c=>`${c.name} ${c.phone}`.toLowerCase().includes(query));
        document.querySelector("#customer-table").innerHTML = rows.length ? `<div class="scroll"><table><thead><tr><th>Customer</th><th>WhatsApp number</th><th>Promotions</th><th>Permission source</th><th></th></tr></thead><tbody>${rows.map(c=>`<tr><td><b>${esc(c.name)}</b>${c.notes ? `<small>${esc(c.notes)}</small>` : ''}</td><td>${esc(c.phone)}</td><td>${preference(c)}</td><td>${esc(c.consent_note || 'Not recorded')}</td><td><a href="#customers/edit/${c.id}">Edit →</a></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>No customers here yet.</b><p>Add a customer or import contacts from your invoices.</p></div>';
      };
      document.querySelector("#customer-search").oninput = draw; draw();
      document.querySelector("#import-customers").onclick = async event => {
        event.target.disabled = true;
        try { const result = await api("/customers/import-invoices","POST",{}); toast(`${result.imported} contacts imported; ${result.skipped} duplicate or invalid entries skipped. Permission is not assumed.`); await marketingScreen(ctx); }
        catch (err) { error(err); event.target.disabled = false; }
      };
      return;
    }
    const config = await api("/marketing/config");
    if (!current()) return;
    const [, action, id] = route.split("/");
    const banner = !config.ready ? `<div class="notice">WhatsApp sending needs configuration. You can still save campaign drafts. ${esc(config.reasons.join(' '))}</div>` : '';
    if (action === "new" || action === "edit") {
      const campaign = action === "edit" ? await api("/campaigns/"+id) : {};
      if (!current()) return;
      if (campaign.status && campaign.status !== 'draft') throw Error("This campaign has already been queued.");
      shell(heading("WHATSAPP CAMPAIGNS", action === "edit" ? "Refine your campaign." : "Give your next offer a voice.", "Write a message, add a flyer, then review your audience.", '<a href="#campaigns">← Campaigns</a>') + banner +
        `<form id="campaign-form"><div class="marketing-composer"><div>${panel("01 / Your campaign", `<div id="error" role="alert"></div>${field("Campaign name *", "title", campaign.title, 'required maxlength="150" placeholder="e.g. Weekend EV offers"')}${area("Custom message *", "message", campaign.message,900)}<p class="form-note">This text is sent with the customer’s name through your approved WhatsApp template. Maximum 900 characters.</p>`)}${panel("02 / Add an image", `<label class="marketing-upload" for="campaign-image"><span>↥</span><b>Choose your advertisement image</b><small>JPG or PNG · up to 2 MB · optional</small><input type="file" id="campaign-image" accept="image/png,image/jpeg"></label><button type="button" id="remove-image" class="textbtn">Remove image</button><p class="form-note">${config.mediaReady ? 'Your flyer will accompany the message.' : 'Image sending needs a public HTTPS address. You can save an image draft now.'}</p>`)}<div class="formfooter"><a href="#campaigns">Cancel</a><button class="primary">Save & review recipients →</button></div></div><div>${panel("Message preview", '<div class="marketing-phone"><div class="marketing-phone-header"><span>◉</span><div><b>Ride For You</b><small>WhatsApp Business</small></div></div><div class="marketing-bubble"><img id="flyer-preview" alt="Advertisement preview" hidden><p class="marketing-greeting">Hello, Customer</p><div id="message-preview" class="prewrap"></div><small>Custom content preview · template wording may also appear</small></div></div>')}<p class="form-note">Saving a draft sends nothing. You’ll review the exact recipient list before sending.</p></div></div></form>`,route);
      const form = document.querySelector("#campaign-form"), preview = document.querySelector("#flyer-preview");
      let image = null, removeImage = false, readingImage = false;
      const update = () => { document.querySelector("#message-preview").textContent = form.message.value || 'Your offer, announcement, or update will appear here.'; };
      form.message.oninput = update; update();
      if (campaign.imageUrl) { preview.src = campaign.imageUrl; preview.hidden = false; }
      document.querySelector("#campaign-image").onchange = async event => {
        const file = event.target.files[0]; if (!file) return;
        readingImage = true;
        try {
          if (!['image/png','image/jpeg'].includes(file.type) || file.size > 2*1024*1024) throw Error("Choose a JPG or PNG up to 2 MB.");
          const value = await new Promise((resolve,reject)=>{ const reader = new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(Error('Could not read image.')); reader.readAsDataURL(file); });
          const check = new Image(); check.src = value; await check.decode();
          image = value; removeImage = false; preview.src = image; preview.hidden = false;
        } catch (err) { event.target.value = ''; error(err); }
        finally { readingImage = false; }
      };
      document.querySelector("#remove-image").onclick = () => { image=null; removeImage=true; preview.hidden=true; preview.removeAttribute('src'); document.querySelector("#campaign-image").value=''; };
      form.onsubmit = async event => {
        event.preventDefault();
        if (readingImage) return error(Error('Please wait for the image to finish loading.'));
        event.submitter.disabled = true;
        try { const result = await api("/campaigns"+(campaign.id ? '/'+campaign.id : ''),campaign.id?'PUT':'POST',{title:form.elements.title.value,message:form.message.value,image,removeImage}); location.hash = 'campaigns/'+result.id; }
        catch (err) { error(err); event.submitter.disabled=false; }
      };
      return;
    }
    if (action) {
      const campaign = await api("/campaigns/"+action);
      if (!current()) return;
      shell(heading("WHATSAPP CAMPAIGNS", esc(campaign.title), campaign.status === 'draft' ? 'Review your message and audience before sending.' : 'Follow the progress of your campaign.', `<a href="#campaigns">← Campaigns</a>${campaign.status==='draft'?`<a href="#campaigns/edit/${campaign.id}"><button>Edit draft</button></a>`:''}`) + banner +
        `<div id="error" role="alert"></div><div class="marketing-composer"><div>${panel("Campaign message",`${campaign.imageUrl?`<img class="marketing-saved-image" src="${esc(campaign.imageUrl)}" alt="Campaign flyer">`:''}<p class="prewrap">${esc(campaign.message)}</p><p class="form-note">Sent with each customer’s name using ${esc(campaign.image_id?config.imageTemplate:config.textTemplate)} · ${esc(config.language)}.</p>`)}<div id="campaign-results"></div></div><div>${panel("Your audience", `<p>All customers subscribed to promotional messages.</p><p class="muted">Duplicate numbers and unsubscribed customers are excluded. The saved recipient list cannot change after you send.</p>${campaign.status==='draft'?'<button class="primary" id="review-campaign">Review recipients →</button>':''}<div id="recipient-review"></div>`)}<p class="form-note">Accepted means the provider accepted the message, not that the customer received or read it. Uncertain outcomes need checking in provider logs.</p></div></div>`,route);
      const drawResults = row => {
        const target = document.querySelector("#campaign-results"); if (!current() || !target) return;
        const counts = row.counts;
        target.innerHTML = row.status==='draft' ? '' : panel('Send results',`<p><b>${esc(row.status.toUpperCase())}</b> · ${row.recipients.length} recipients</p><div class="marketing-result-counts">${Object.entries(labels).map(([key,label])=>`<span><b>${counts[key]||0}</b> ${label}</span>`).join('')}</div>${row.status==='queued'?'<button id="stop-campaign">Stop remaining messages</button><p class="form-note">A message already being sent may still complete.</p>':''}<div class="scroll"><table><thead><tr><th>Customer</th><th>Status</th><th>Details</th></tr></thead><tbody>${row.recipients.map(r=>`<tr><td>${esc(r.name)}<small>${esc(r.phone)}</small></td><td><span class="tag ${r.status==='unknown'||r.status==='failed'?'due':''}">${esc(labels[r.status]||r.status)}</span></td><td>${esc(r.detail)}${r.provider_id?`<small>Message ID: ${esc(r.provider_id)}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`);
        const stop = document.querySelector("#stop-campaign");
        if (stop) stop.onclick = async () => { stop.disabled=true; try { await api('/campaigns/'+row.id+'/cancel','POST',{}); await poll(); } catch(err) {error(err);stop.disabled=false;} };
      };
      let pollTimer;
      const poll = async () => {
        clearTimeout(pollTimer);
        if (!current() || !document.querySelector('#campaign-results')) return;
        try { const row=await api('/campaigns/'+campaign.id); drawResults(row); if(current()&&(row.status==='queued'||row.counts.sending)) pollTimer=setTimeout(poll,2000); }
        catch(err) { if(current()) error(err); }
      };
      drawResults(campaign);
      if(campaign.status==='queued') pollTimer=setTimeout(poll,2000);
      const reviewButton=document.querySelector('#review-campaign');
      if(reviewButton) reviewButton.onclick=async()=>{
        reviewButton.disabled=true;
        try {
          const review=await api('/campaigns/'+campaign.id+'/review','POST',{});
          if(!current())return;
          const canSend=config.ready && (!campaign.image_id||config.mediaReady) && review.count>0;
          document.querySelector('#recipient-review').innerHTML=`<div class="marketing-review"><h3>${review.count} customer${review.count===1?'':'s'} will receive this campaign</h3><div class="marketing-recipient-list">${review.recipients.map(r=>`<p><b>${esc(r.name)}</b><span>${esc(r.phone)}</span></p>`).join('')||'<p>Add customers and record permission before sending.</p>'}</div><button class="primary" id="send-campaign" ${canSend?'':'disabled'}>Send to all ${review.count} customers →</button><p class="form-note">This sends real WhatsApp messages. Provider charges may apply.</p></div>`;
          const requestKey=crypto.randomUUID();
          document.querySelector('#send-campaign').onclick=async event=>{
            event.target.disabled=true;
            try { await api('/campaigns/'+campaign.id+'/send','POST',{requestKey,reviewHash:review.reviewHash}); toast('Campaign queued. You can follow its progress below.'); await marketingScreen(ctx); }
            catch(err){error(err);event.target.disabled=false;}
          };
        } catch(err){error(err);} finally{reviewButton.disabled=false;}
      };
      return;
    }
    const campaigns=await api('/campaigns');
    if(!current())return;
    shell(heading('WHATSAPP CAMPAIGNS','Good news travels.', 'Create an offer, add your image, and reach your subscribed customers.','<a href="#customers"><button>View customers</button></a><a href="#campaigns/new"><button class="primary">+ New campaign</button></a>')+banner+
      `<div class="marketing-intro"><div><div class="eyebrow">A MESSAGE THAT MATTERS</div><h2>Your next offer.<br/>Their next ride.</h2><p>Personal messages. Beautiful flyers.<br/>One place to keep track of every campaign.</p></div><div class="marketing-intro-art" aria-hidden="true">↗<span>LET’S GET MOVING</span></div></div><section class="panel"><div class="panelhead"><h2>Your campaigns</h2><span class="muted">${campaigns.length} total</span></div>${campaigns.length?`<div class="scroll"><table><thead><tr><th>Campaign</th><th>Created</th><th>Status</th><th>Recipients</th><th></th></tr></thead><tbody>${campaigns.map(c=>`<tr><td><b>${esc(c.title)}</b><small>${c.image_id?'Image + message':'Text message'}</small></td><td>${esc(dateLabel(c.created))}</td><td><span class="tag">${esc(c.status)}</span></td><td>${Object.values(c.counts).reduce((n,v)=>n+v,0)}</td><td><a href="#campaigns/${c.id}">${c.status==='draft'?'Review draft':'View results'} →</a></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><b>Your next campaign starts here.</b><p>Create a message and flyer. Save it as a draft before sending.</p><a href="#campaigns/new"><button class="primary">Create your first campaign →</button></a></div>'}</section>`,route);
  } catch(err) { if(current()) { shell(heading('CUSTOMERS & CAMPAIGNS','Could not open this page.',esc(err.message),'<a href="#campaigns">← Campaigns</a>'),route); } }
}
