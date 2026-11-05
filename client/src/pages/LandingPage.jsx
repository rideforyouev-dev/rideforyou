import { useState, useEffect } from "react";
import api from "../api/axios";
import { 
  Zap, 
  ChevronRight, 
  Phone, 
  Mail, 
  ArrowRight,
  Menu,
  X,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  BatteryCharging,
  CreditCard,
  Wrench,
  Clock,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";

const MODELS = [
  {
    id: "ridepro",
    name: "RIDEPRO",
    tagline: "Smart Ride. Everyday.",
    description: "The ultimate daily commuter combining nimble handling with dependable efficiency and ultra-low running costs.",
    image: "/assets/scooter-ridepro.jpg",
    badge: "Most Popular",
    variants: [
      { battery: "Graphene Battery", spec: "60V 32Ah", range: "60 kms", price: 49999, warranty: "1 Year" },
      { battery: "Lithium Ion", spec: "48V 27Ah", range: "60 kms", price: 61000, warranty: "3 Years" },
      { battery: "Lithium Ion", spec: "60V 27Ah", range: "90 kms", price: 65999, warranty: "3 Years" },
      { battery: "Lithium Ion", spec: "60V 36Ah", range: "110 kms", price: 74999, warranty: "3 Years" },
      { battery: "Lithium Ion", spec: "60V 45Ah", range: "140 kms", price: 84999, warranty: "3 Years" },
    ]
  },
  {
    id: "ridecharge",
    name: "RIDECHARGE",
    tagline: "More Charge. More Distance.",
    description: "Engineered for high-endurance riders demanding extended range, rugged frame durability, and heavy load capability.",
    image: "/assets/scooter-ridecharge.jpg",
    badge: "Extended Range",
    variants: [
      { battery: "Graphene Battery", spec: "60V 32Ah", range: "60 kms", price: 64999, warranty: "1 Year" },
      { battery: "Lithium Ion", spec: "60V 27Ah", range: "85 kms", price: 74999, warranty: "3 Years" },
      { battery: "Lithium Ion", spec: "60V 36Ah", range: "100 kms", price: 84999, warranty: "3 Years" },
      { battery: "Lithium Ion", spec: "60V 45Ah", range: "120 kms", price: 99999, warranty: "3 Years" },
    ]
  },
  {
    id: "ridepremium",
    name: "RIDEPREMIUM",
    tagline: "Premium Ride. Superior Performance.",
    description: "Top-tier luxury styling, high-torque instant acceleration, and dual disc suspension for riders who accept no compromises.",
    image: "/assets/scooter-ridepremium.jpg",
    badge: "Flagship Luxury",
    variants: [
      { battery: "Graphene Battery", spec: "60V 32Ah", range: "60 kms", price: 69999, warranty: "1 Year" },
      { battery: "Lithium Ion", spec: "60V 27Ah", range: "85 kms", price: 79999, warranty: "3 Years" },
      { battery: "Lithium Ion", spec: "60V 36Ah", range: "100 kms", price: 84999, warranty: "3 Years" },
      { battery: "Lithium Ion", spec: "60V 45Ah", range: "120 kms", price: 99999, warranty: "3 Years" },
    ]
  }
];

const SHOWROOM_PHOTOS = [
  {
    image: "/assets/showroom-1.jpeg",
    title: "Official Dealership Experience Center",
    desc: "Explore the complete lineup of electric two-wheelers in person."
  },
  {
    image: "/assets/showroom-2.jpeg",
    title: "Display Fleet & Customer Lounge",
    desc: "Test ride any model right off our showroom floor with advisor support."
  },
  {
    image: "/assets/showroom-3.jpeg",
    title: "Authorized Service & Component Hub",
    desc: "Certified technicians, original batteries and dedicated after-sales care."
  }
];

const LandingPage = () => {
  const [selectedVariants, setSelectedVariants] = useState({
    ridepro: 0,
    ridecharge: 0,
    ridepremium: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    model: 'RIDEPRO',
    battery: 'Lithium Ion (3 Years Warranty)',
    financing: 'Yes, I want EMI / Loan',
    message: ''
  });

  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => setShowCookieBanner(true), 2000);
    }
  }, []);

  const handleCookieAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowCookieBanner(false);
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVariantSelect = (modelId, idx) => {
    setSelectedVariants(prev => ({ ...prev, [modelId]: idx }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await api.post('/customers', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: 'Hyderabad Showroom',
        message: `Sale Inquiry: Model ${formData.model} | Battery: ${formData.battery} | Finance: ${formData.financing} | Notes: ${formData.message}`
      });
      if (response.data.success || response.status === 200 || response.status === 201) {
        setShowSuccessModal(true);
        setFormData({ name: '', email: '', phone: '', model: 'RIDEPRO', battery: 'Lithium Ion (3 Years Warranty)', financing: 'Yes, I want EMI / Loan', message: '' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to submit. Please call us directly at +91 7989776255.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-primary-500/30 font-sans">
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm transition-opacity" onClick={() => setShowSuccessModal(false)} />
          <div className="relative bg-slate-900 border border-primary-500/30 p-10 rounded-[2rem] max-w-md w-full shadow-[0_0_50px_rgba(20,184,166,0.15)] text-center animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-primary-500/20">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-3xl font-black font-display mb-4 text-white tracking-tight">Booking Received!</h3>
            <p className="text-slate-400 font-medium mb-6 leading-relaxed text-base">
              Thank you for choosing <span className="text-primary-400 font-bold">Ride For You EV</span>. Our showroom advisor will contact you shortly to confirm your test ride and assist with vehicle details and financing.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-slate-300 text-left mb-6 space-y-1">
              <div>📍 <b>Showroom:</b> Green Hills Colony, Sundar Rao Nagar, Hyderabad</div>
              <div>📞 <b>Contact:</b> +91 7989776255</div>
            </div>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-primary-400 transition-all active:scale-[0.98] shadow-lg"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-teal-500 text-black font-black text-xs md:text-sm py-2 px-4 text-center tracking-wide flex items-center justify-center gap-2">
        <Sparkles size={16} className="text-slate-950 fill-slate-950" />
        <span>AUTHORIZED ELECTRIC TWO-WHEELER SHOWROOM · HYDERABAD · TEST RIDES AVAILABLE DAILY</span>
        <a href="#contact" className="underline ml-2 hover:text-white transition-colors">Book a Test Ride →</a>
      </div>

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-slate-900/90 backdrop-blur-xl border-b border-white/5 py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <img src="/assets/logo.png" alt="Ride For You EV" className="h-10 w-auto object-contain" />
            <span className="text-2xl font-black tracking-tighter uppercase font-display">
              Ride <span className="text-primary-400">For You EV</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-10 font-bold text-sm uppercase tracking-widest text-slate-400">
            <a href="#models" className="hover:text-primary-400 transition-colors">EV Models</a>
            <a href="#showroom" className="hover:text-primary-400 transition-colors">Showroom</a>
            <a href="#benefits" className="hover:text-primary-400 transition-colors">Warranty & Loans</a>
            <a href="#contact" className="bg-white text-black px-8 py-3 rounded-full hover:bg-primary-400 hover:text-black transition-all hover:shadow-[0_0_20px_rgba(20,184,166,0.4)]">
              Book Test Ride
            </a>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/95 border-b border-white/10 px-6 py-6 space-y-4">
            <a href="#models" onClick={() => setMobileMenuOpen(false)} className="block font-bold py-2 text-slate-300">EV Models & Prices</a>
            <a href="#showroom" onClick={() => setMobileMenuOpen(false)} className="block font-bold py-2 text-slate-300">Showroom Photos</a>
            <a href="#benefits" onClick={() => setMobileMenuOpen(false)} className="block font-bold py-2 text-slate-300">Warranty & Financing</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block font-bold py-2 text-primary-400">Book a Test Ride</a>
            <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
              📞 Call: <b className="text-white">+91 7989776255</b>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-36 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-500/10 blur-[120px] rounded-full -z-10 animate-pulse" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-700/10 blur-[100px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-primary-400 font-bold text-xs uppercase tracking-[0.2em]">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-ping" />
                Authorized Electric Two-Wheeler Dealership
              </div>
              <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter font-display text-white">
                SWITCH TO <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">ELECTRIC.</span> <br/>
                RIDE THE FUTURE.
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed max-w-lg font-medium">
                High-performance electric scooters engineered for power, ultra-long range up to <strong className="text-white">140 kms</strong>, and instant savings. Starting from only <strong className="text-primary-400">₹49,999/-</strong>.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5 pt-2">
                <a href="#models" className="flex items-center justify-center gap-3 bg-primary-500 hover:bg-primary-400 text-black font-black uppercase tracking-tighter text-lg px-10 py-5 rounded-2xl transition-all shadow-xl shadow-primary-500/20 active:scale-95">
                  Explore Models & Prices <ChevronRight size={20} />
                </a>
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
                  <ShieldCheck size={26} className="text-primary-400 shrink-0" />
                  <div className="text-sm">
                    <div className="font-bold text-slate-400 uppercase tracking-wider text-xs">Warranty Guarantee</div>
                    <div className="text-white font-black text-base whitespace-nowrap">3 Years Battery Warranty</div>
                  </div>
                </div>
              </div>

              {/* Quick Specs Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                <div>
                  <div className="text-2xl font-black text-white font-display">140 KM</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Max Range</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white font-display">3 YEARS</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Battery Warranty</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white font-display">₹0.15/KM</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Running Cost</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white font-display">EASY EMI</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">In-House Loans</div>
                </div>
              </div>
            </div>

            {/* Hero Image (Sleek consumer electric scooty from pamphlet) */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-teal-500 rounded-[3rem] blur-xl opacity-30 group-hover:opacity-50 transition duration-1000" />
              <div className="relative bg-slate-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl p-4 flex items-center justify-center">
                <img 
                  src="/assets/scooter-hero.jpg" 
                  alt="Ride For You EV Electric Scooter" 
                  className="w-full rounded-[2.5rem] object-cover transition-all duration-700 group-hover:scale-105"
                />
                <div className="absolute bottom-6 left-6 right-6 bg-slate-950/85 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-primary-400">Official EV Dealership</span>
                    <h4 className="text-lg font-black text-white">Ride For You EV</h4>
                  </div>
                  <span className="bg-primary-500 text-black text-xs font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
                    Ready Stock
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="border-y border-white/5 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Battery Warranty', value: '3 Years' },
              { label: 'Models Available', value: '3 Flagships' },
              { label: 'Financing', value: 'Easy In-House EMI' },
              { label: 'Customer Rating', value: '4.9 / 5' }
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black text-white mb-1 tracking-tighter font-display">{stat.value}</div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Models & Pricing Section (Content from the Banner in previous card style) */}
      <section id="models" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div>
              <h2 className="text-sm font-bold text-primary-500 uppercase tracking-[0.3em] mb-4">Official Price List</h2>
              <h3 className="text-4xl lg:text-5xl font-black tracking-tighter font-display text-white">ELECTRIC TWO-WHEELERS.</h3>
            </div>
            <p className="text-slate-400 max-w-sm font-medium">Choose your scooter and select from multiple Graphene or Lithium-Ion battery pack capacities.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {MODELS.map((ev) => {
              const selectedIdx = selectedVariants[ev.id];
              const variant = ev.variants[selectedIdx];

              return (
                <div key={ev.id} className="group relative bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/[0.08] transition-all duration-500 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-2xl font-black tracking-tighter font-display text-white">{ev.name}</h4>
                      <p className="text-primary-500 font-bold tracking-widest uppercase mt-1 text-[11px]">{ev.tagline}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-primary-500/10 text-primary-400 border border-primary-500/30 px-3 py-1 rounded-full">
                      {ev.badge}
                    </span>
                  </div>
                  
                  {/* Vehicle Image */}
                  <div className="aspect-[4/3] bg-slate-900 border border-white/5 rounded-3xl overflow-hidden mb-6 relative flex items-center justify-center shadow-inner">
                    <img 
                      src={ev.image} 
                      alt={ev.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  </div>

                  <p className="text-slate-400 text-xs font-medium leading-relaxed mb-6">{ev.description}</p>

                  {/* Battery Spec Selector */}
                  <div className="space-y-2 mb-6">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Available Battery Configurations:</span>
                    <div className="space-y-1.5">
                      {ev.variants.map((v, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleVariantSelect(ev.id, idx)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${
                            selectedIdx === idx 
                              ? "bg-primary-500/20 border-primary-500 text-white font-bold" 
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          <div>
                            <span className="font-bold text-white">{v.battery} · {v.spec}</span>
                            <span className="text-[10px] text-slate-400 block">{v.range} range ({v.warranty} warranty)</span>
                          </div>
                          <span className="text-primary-400 font-bold text-sm">₹{v.price.toLocaleString('en-IN')}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Box */}
                  <div className="mt-auto space-y-4">
                    <div className="bg-slate-950/60 p-6 rounded-3xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-slate-400">Battery & Spec</span>
                        <span className="text-slate-200 font-bold">{variant.battery}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-slate-400">Official Warranty</span>
                        <span className="text-primary-400 font-bold">{variant.warranty}</span>
                      </div>
                      <div className="h-px bg-white/10 w-full"></div>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-primary-400 font-black block">Price Starting At</span>
                          <span className="text-xs text-slate-400">{variant.range} Range · {variant.spec}</span>
                        </div>
                        <span className="text-3xl font-black tracking-tighter text-white font-display">₹{variant.price.toLocaleString('en-IN')}/-</span>
                      </div>
                    </div>

                    <a 
                      href="#contact" 
                      onClick={() => setFormData(prev => ({ ...prev, model: ev.name, battery: `${variant.battery} (${variant.spec})` }))}
                      className="w-full bg-gradient-to-r from-primary-500 to-teal-400 hover:from-primary-400 hover:to-teal-300 text-slate-950 font-black uppercase tracking-wider text-xs py-4 rounded-xl transition-all text-center block shadow-lg shadow-primary-500/20 active:scale-95"
                    >
                      Book Test Ride →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Showroom Photos Section */}
      <section id="showroom" className="py-32 relative border-t border-white/5 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div>
              <h2 className="text-sm font-bold text-primary-500 uppercase tracking-[0.3em] mb-4">Hyderabad Dealership</h2>
              <h3 className="text-4xl lg:text-5xl font-black tracking-tighter font-display text-white">VISIT OUR SHOWROOM.</h3>
            </div>
            <div className="text-slate-400 text-sm max-w-sm">
              <p>📍 <b>Green Hills Colony, Sundar Rao Nagar, Hyderabad</b></p>
              <p className="mt-1">🕒 Open Mon – Sun : 9:30 AM – 8:30 PM</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {SHOWROOM_PHOTOS.map((item, i) => (
              <div key={i} className="group bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden p-3 hover:bg-white/[0.08] transition-all duration-500">
                <div className="aspect-[4/3] rounded-[2rem] overflow-hidden mb-5">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="px-4 pb-4">
                  <h4 className="text-lg font-black text-white font-display mb-1">{item.title}</h4>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features & Warranty Section */}
      <section id="benefits" className="py-32 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-sm font-bold text-primary-500 uppercase tracking-[0.3em] mb-4">Dealership Guarantees</h2>
                <h3 className="text-4xl lg:text-5xl font-black tracking-tighter font-display text-white">BUILT TO EMPOWER <br/>YOUR JOURNEY.</h3>
              </div>
              <p className="text-lg text-slate-400 leading-relaxed font-medium">
                Every vehicle purchased from Ride For You EV includes comprehensive manufacturer warranties, verified high-energy battery cells, expert technical maintenance, and flexible financing.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <ShieldCheck className="text-primary-400 mb-3" size={28} />
                  <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">3 Years Warranty</h4>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">Full coverage on Lithium-Ion battery packs.</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <CreditCard className="text-primary-400 mb-3" size={28} />
                  <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Easy Dealership EMI</h4>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">In-house financing & top vendor loans.</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <BatteryCharging className="text-primary-400 mb-3" size={28} />
                  <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Up to 140 KM Range</h4>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">High capacity 60V 45Ah options available.</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <Wrench className="text-primary-400 mb-3" size={28} />
                  <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">In-House Workshop</h4>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">Certified technicians and genuine spare parts.</p>
                </div>
              </div>
            </div>

            <div className="relative rounded-[3rem] overflow-hidden border border-white/10 aspect-square group shadow-2xl">
              <img 
                src="/assets/showroom-2.jpeg" 
                alt="Showroom display" 
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8">
                <span className="text-primary-400 font-black uppercase text-xs tracking-widest">Test Rides Available Daily</span>
                <h4 className="text-2xl font-black text-white">Experience Zero Emission Driving</h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Test Ride Inquiry Section (Original form design adapted for sales) */}
      <section id="contact" className="py-32 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary-800/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-[4rem] border border-white/10 p-12 lg:p-20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 text-white/5 uppercase font-black text-8xl font-display pointer-events-none select-none">
              RIDE
            </div>

            <div className="grid lg:grid-cols-2 gap-20 relative z-10">
              <div className="space-y-12">
                <div>
                  <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-4 font-display text-white">
                    BOOK YOUR <br/><span className="text-primary-400">TEST RIDE.</span>
                  </h2>
                  <p className="text-slate-400 text-base font-normal leading-relaxed">
                    Experience the silent power, instant torque, and comfort of Ride For You electric scooters. Fill out your details below and our Hyderabad showroom advisors will confirm your booking.
                  </p>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-6 items-start">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Phone className="text-black" />
                    </div>
                    <div>
                      <h5 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Sales Helpline</h5>
                      <p className="text-xl font-black text-white">+91 7989776255</p>
                    </div>
                  </div>
                  <div className="flex gap-6 items-start">
                    <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
                      <MapPin className="text-black" />
                    </div>
                    <div>
                      <h5 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Showroom Address</h5>
                      <p className="text-sm font-semibold text-white leading-relaxed">Green Hills Colony, Sundar Rao Nagar, Hyderabad</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {status.message && (
                      <div className="p-4 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-500/10 border text-red-400 border-red-500/20">
                        {status.message}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                        Full Name <span className="text-primary-400">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="name" 
                        required 
                        value={formData.name} 
                        onChange={handleChange}
                        placeholder="e.g. Ramesh Reddy" 
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all font-medium placeholder:text-slate-500 text-white text-sm" 
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                          Phone Number <span className="text-primary-400">*</span>
                        </label>
                        <input 
                          type="tel" 
                          name="phone" 
                          required 
                          value={formData.phone} 
                          onChange={handleChange}
                          placeholder="+91 98765 43210" 
                          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all font-medium placeholder:text-slate-500 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                          Selected Model
                        </label>
                        <select 
                          name="model" 
                          value={formData.model} 
                          onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all font-medium cursor-pointer text-white text-sm"
                        >
                          <option value="RIDEPRO">RIDEPRO</option>
                          <option value="RIDECHARGE">RIDECHARGE</option>
                          <option value="RIDEPREMIUM">RIDEPREMIUM</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                          Battery Variant
                        </label>
                        <select 
                          name="battery" 
                          value={formData.battery} 
                          onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all font-medium cursor-pointer text-white text-sm"
                        >
                          <option value="Lithium Ion (3 Years Warranty)">Lithium-Ion (3 Yrs Warranty)</option>
                          <option value="Graphene (1 Year Warranty)">Graphene (1 Yr Warranty)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                          Financing / Loan
                        </label>
                        <select 
                          name="financing" 
                          value={formData.financing} 
                          onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all font-medium cursor-pointer text-white text-sm"
                        >
                          <option value="Yes, I want EMI / Loan">Yes, I want EMI / Loan</option>
                          <option value="No, Full Payment">Full Upfront Payment</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                        Email Address (Optional)
                      </label>
                      <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange}
                        placeholder="yourname@gmail.com" 
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all font-medium placeholder:text-slate-500 text-white text-sm"
                      />
                    </div>

                    <button 
                      disabled={loading}
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary-500 to-teal-400 hover:from-primary-400 hover:to-teal-300 text-slate-950 font-black uppercase tracking-wider py-4 rounded-xl transition-all duration-300 shadow-xl shadow-primary-500/25 text-sm flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 mt-2"
                    >
                      {loading ? 'Reserving Your Slot...' : 'Schedule Test Ride Now'}
                      <ArrowRight size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <img src="/assets/logo.png" alt="Ride For You EV" className="h-9 w-auto" />
                <span className="font-black tracking-tighter uppercase text-2xl font-display text-white">Ride For You EV</span>
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Authorized dealership for high-performance electric two-wheelers in Hyderabad. Switch to Electric, Ride the Future.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-white mb-6">Electric Models</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li><a href="#models" className="hover:text-primary-400 transition-colors">RIDEPRO</a></li>
                <li><a href="#models" className="hover:text-primary-400 transition-colors">RIDECHARGE</a></li>
                <li><a href="#models" className="hover:text-primary-400 transition-colors">RIDEPREMIUM</a></li>
                <li><a href="#benefits" className="hover:text-primary-400 transition-colors">3 Years Battery Warranty</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-white mb-6">Compliance</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li><Link to="/terms-and-conditions" className="hover:text-primary-400 transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-primary-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/refund-policy" className="hover:text-primary-400 transition-colors">Refund & Cancellation</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-white mb-6">Showroom Location</h4>
              <div className="space-y-3 text-sm font-bold text-slate-500">
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-primary-500 flex-shrink-0 mt-0.5" />
                  <p>Green Hills Colony, Sundar Rao Nagar, Hyderabad, Telangana</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-primary-500" />
                  <p>+91 7989776255</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-primary-500" />
                  <p>support@rideforyouev.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">Company</h4>
              <p className="font-bold text-white text-sm">RIDEFORYOU.EV MOBILITY INDIA PRIVATE LIMITED <span className="text-slate-500 mx-2">|</span> <span className="text-primary-400 font-medium">Clean Rides, Brighter Tomorrow</span></p>
            </div>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">© 2026 Ride For You EV. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      {/* Cookie Consent Banner */}
      {showCookieBanner && (
        <div className="fixed bottom-8 left-8 right-8 z-[100] animate-in slide-in-from-bottom-10 duration-500">
          <div className="max-w-7xl mx-auto">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-400 flex-shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                  We use cookies to enhance your experience and analyze our showroom traffic. By clicking <span className="text-white font-bold">"Accept All"</span>, you consent to our use of cookies.
                </p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => setShowCookieBanner(false)}
                  className="flex-1 md:flex-none px-6 py-3 text-sm font-bold text-slate-500 hover:text-white transition-colors"
                >
                  Decline
                </button>
                <button 
                  onClick={handleCookieAccept}
                  className="flex-1 md:flex-none px-10 py-4 bg-primary-500 hover:bg-primary-400 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
