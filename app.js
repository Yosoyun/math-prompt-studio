/* Maths Prompt Studio application */
(function () {
  'use strict';

  var aboutSection = document.getElementById('about');
  var rawConfig = window.MPS_CONFIG || {};
  var CFG = {
    email: rawConfig.email || (aboutSection ? (aboutSection.getAttribute('data-contact-email') || '') : ''),
    whatsapp: rawConfig.whatsapp || (aboutSection ? (aboutSection.getAttribute('data-contact-whatsapp') || '') : ''),
    instagram: rawConfig.instagram || (aboutSection ? (aboutSection.getAttribute('data-contact-instagram') || '') : ''),
    googleFormUrl: rawConfig.googleFormUrl || '', photoUrl: rawConfig.photoUrl || '',
    analyticsSrc: rawConfig.analyticsSrc || '', analyticsDomain: rawConfig.analyticsDomain || ''
  };
  var SITE = 'https://yosoyun.github.io/math-prompt-studio/';
  // AUD-A P1/A3: render cards from the compact catalog and fetch the complete
  // prompt corpus only when an action genuinely needs promptText.
  var CATALOG = window.PROMPT_CATALOG || window.PROMPT_DATA || { categories: [] };
  var DATA = CATALOG.categories || [];
  var FULL_DATA = window.PROMPT_DATA && window.PROMPT_DATA.categories ? window.PROMPT_DATA : null;
  var fullDataPromise = null;
  var fullBySlug = null;
  var SEARCH_KEYWORDS = CATALOG.searchKeywords || [];
  var LANGUAGE_STATUS = CATALOG.languageStatus || { en: { live: true } };
  function isLanguageLive(code) { return !!(LANGUAGE_STATUS[code] && LANGUAGE_STATUS[code].live); }
  var GROUP_ORDER = ['Solving & Checking', 'Practice & Assessment', 'Teaching Materials', 'Writing & Content', 'Engagement', 'Support', 'Teacher Productivity'];

  function expandSearchBits(code) {
    if (!code || !SEARCH_KEYWORDS.length) return '';
    try {
      var raw = atob(code + '='.repeat((4 - code.length % 4) % 4));
      return SEARCH_KEYWORDS.filter(function (_, index) { return raw.charCodeAt(index >> 3) & (1 << (index & 7)); }).join(' ');
    } catch (e) { return ''; }
  }

  var ALL = [];
  DATA.forEach(function (cat) {
    if (!cat.group) cat.group = 'More';
    (cat.prompts || []).forEach(function (p, i) { p._cat = cat.category; p._catTitle = cat.categoryTitle; p._catIcon = cat.categoryIcon || ''; p._group = cat.group; p._id = cat.category + '-' + i; p._searchExtras = expandSearchBits(p.sk); ALL.push(p); });
  });
  var ALL_BY_SLUG = Object.create(null);
  ALL.forEach(function (prompt) { ALL_BY_SLUG[prompt.slug] = prompt; });
  var catalogLanguagePromises = Object.create(null);
  var GROUPS = GROUP_ORDER.filter(function (g) { return DATA.some(function (c) { return c.group === g; }); });
  DATA.forEach(function (c) { if (GROUPS.indexOf(c.group) === -1) GROUPS.push(c.group); });

  var state = { group: 'all', query: '', prevEmpty: true, lang: 'en', exam: 'all', aud: 'all', fmt: 'all', renderLimit: 60, quickSegment: '', quickJob: '', quickPrompt: null, hasRendered: false };
  var favorites = new Set();
  var recentSlugs = [];
  var restoredLanguage = 'en';
  try { var savedLanguage = localStorage.getItem('mps-lang'); if (isLanguageLive(savedLanguage)) restoredLanguage = savedLanguage; } catch (e) {}
  try { favorites = new Set(JSON.parse(localStorage.getItem('mps-favorites') || '[]')); } catch (e2) { favorites = new Set(); }
  try { recentSlugs = JSON.parse(localStorage.getItem('mps-recent') || '[]'); if (!Array.isArray(recentSlugs)) recentSlugs = []; } catch (e3) { recentSlugs = []; }
  try { state.quickSegment = localStorage.getItem('mps-segment') || ''; } catch (e4) {}

  // AUD-A, AUD-C, AUD-E: small dictionary for the new activation, retention,
  // progressive-render and sharing chrome. Existing prompt content still uses T().
  var UI = {
    en: {
      all: 'All', saved: 'Saved', everyone: 'Everyone', teachers: 'For teachers', students: 'For students', allExams: 'All exams',
      chooseSegment: 'Choose what you teach', chooseJob: 'Now choose what you need', ready: 'Your best starting prompt', openFill: 'Open and fill details',
      quickKicker: '60-second start', quickTitle: 'What do you need for your next class?', quickSub: 'Choose who you teach, then choose the job. Your best matching prompt will open ready to fill.', segmentSmall: 'We will remember this on this device.', jobSmall: 'Paper, solve and verify, worksheet, PPT, or quiz.',
      quickHint: 'Three taps: segment, job, then open.', loading: 'Loading the full prompt…', loadError: 'The full prompt could not load. Please check your connection and try again.',
      paper: 'Paper', solveVerify: 'Solve + Verify', worksheet: 'Worksheet', ppt: 'PPT', quiz: 'Quiz',
      student: 'Student', foundation: 'Foundation',
      copyPrompt: 'Copy prompt', howTo: 'How to use this', share: 'Share', save: 'Save', unsave: 'Remove from saved',
      promptDay: 'Prompt of the day', recent: 'Recently used', savedShelf: 'Your saved prompts', important: 'Most important', added: 'Recently added',
      showMore: 'Show 60 more prompts', surprise: 'Surprise me — random prompt', browseAll: 'Browse all', noMatch: 'No prompts match', related: 'related prompts', found: 'prompts found',
      shareLead: 'Free maths teaching prompt', copied: 'Copied! Paste it into your AI chat.', linkCopied: 'Link copied — send this prompt to a teacher!',
      fillOptional: 'Fill in the blanks here', fillNote: 'Type your details — the prompt and action buttons update automatically.', close: 'Close', copyLink: 'Copy link',
      formatAll: 'All formats', effectiveTitle: 'How to use this effectively', fixLabel: 'If it is not right, reply with this:', openOne: 'Open it in one click (the prompt is copied for you):', getAs: 'Get this as:', promptLabel: 'COPY THE PROMPT',
      openChatGPT: 'Open in ChatGPT', openClaude: 'Open in Claude', searchPlaceholder: 'Search papers, integration, Wolfram, flashcards...',
      freeAI: 'Works on any free AI', needsImageAI: 'Needs an image-making AI', attachPhoto: 'Attach a photo first', makesImages: 'Makes images', photoNeeded: 'Photo needed', textOnly: 'Text only', languageLoadError: 'That language could not load. Please try again.',
      copiedShort: 'Copied!', opened: 'Opened', toolOpenToast: '{tool} is opening with your prompt loaded. It is also copied — if the box is empty in a phone app, paste it, fill the [brackets], and send.', promptsNoun: 'prompts',
      synonymNotice: 'No prompt mentions “{query}” by name yet, so here are the prompts that do that job. Every prompt works in any AI chat — paste it there first.', pickStyle: 'Pick a style + ', chooseStyles: '— choose one of {count} styles —', bestTool: 'Best tool', anyAIChat: 'Any AI chat', reportProblem: 'Report a problem with this prompt', outputFormat: 'Output format',
      wordCopied: 'Copied a Word-ready version — paste it into your AI, then into Word or Docs.', pdfCopied: 'Copied a print-ready PDF version — paste it into your AI, then choose Print > Save as PDF.', pptCopied: 'Copied a slide-deck version — paste it into your AI, then into PowerPoint, Slides, Canva, or Gamma.', copyTechnique: 'Copy this technique', libraryPreparing: 'The library is still being prepared. Please refresh in a moment.'
    },
    hi: {
      all: 'सभी', saved: 'सहेजे हुए', everyone: 'सबके लिए', teachers: 'शिक्षकों के लिए', students: 'छात्रों के लिए', allExams: 'सभी परीक्षाएँ',
      chooseSegment: 'आप किसे पढ़ाते हैं?', chooseJob: 'अब अपना काम चुनें', ready: 'शुरू करने के लिए सही प्रॉम्प्ट', openFill: 'खोलें और जानकारी भरें',
      quickKicker: '60-सेकंड शुरुआत', quickTitle: 'अगली कक्षा के लिए आपको क्या चाहिए?', quickSub: 'पहले अपनी कक्षा या परीक्षा चुनें, फिर काम। सही प्रॉम्प्ट जानकारी भरने के लिए तैयार खुलेगा।', segmentSmall: 'यह चुनाव इसी डिवाइस पर याद रहेगा।', jobSmall: 'पेपर, हल और जाँच, वर्कशीट, PPT या क्विज़।',
      quickHint: 'तीन टैप: वर्ग, काम, फिर खोलें।', loading: 'पूरा प्रॉम्प्ट लोड हो रहा है…', loadError: 'पूरा प्रॉम्प्ट लोड नहीं हुआ। इंटरनेट जाँचकर फिर कोशिश करें।',
      paper: 'पेपर', solveVerify: 'हल + जाँच', worksheet: 'वर्कशीट', ppt: 'PPT', quiz: 'क्विज़',
      student: 'विद्यार्थी', foundation: 'फ़ाउंडेशन',
      copyPrompt: 'प्रॉम्प्ट कॉपी करें', howTo: 'इस्तेमाल कैसे करें', share: 'शेयर करें', save: 'सहेजें', unsave: 'सहेजे से हटाएँ',
      promptDay: 'आज का प्रॉम्प्ट', recent: 'हाल में इस्तेमाल किए', savedShelf: 'आपके सहेजे प्रॉम्प्ट', important: 'सबसे ज़रूरी', added: 'हाल में जोड़े गए',
      showMore: '60 और प्रॉम्प्ट दिखाएँ', surprise: 'कोई भी एक प्रॉम्प्ट दिखाएँ', browseAll: 'सभी देखें', noMatch: 'कोई प्रॉम्प्ट मेल नहीं खाता', related: 'संबंधित प्रॉम्प्ट', found: 'प्रॉम्प्ट मिले',
      shareLead: 'मुफ़्त गणित शिक्षण प्रॉम्प्ट', copied: 'कॉपी हो गया! अपने AI चैट में पेस्ट करें।', linkCopied: 'लिंक कॉपी हो गया — किसी शिक्षक को भेजें!',
      fillOptional: 'यहाँ खाली जगह भरें', fillNote: 'अपनी जानकारी भरें — प्रॉम्प्ट और बटन अपने-आप बदलेंगे।', close: 'बंद करें', copyLink: 'लिंक कॉपी करें',
      formatAll: 'सभी प्रारूप', effectiveTitle: 'इसे प्रभावी ढंग से कैसे इस्तेमाल करें', fixLabel: 'अगर जवाब ठीक न लगे, तो यह भेजें:', openOne: 'एक क्लिक में खोलें (प्रॉम्प्ट आपके लिए कॉपी हो जाएगा):', getAs: 'इसे पाएँ:', promptLabel: 'प्रॉम्प्ट कॉपी करें',
      openChatGPT: 'ChatGPT में खोलें', openClaude: 'Claude में खोलें', searchPlaceholder: 'पेपर, integration, Wolfram, flashcards खोजें...',
      freeAI: 'किसी भी मुफ़्त AI पर काम करता है', needsImageAI: 'चित्र बनाने वाला AI चाहिए', attachPhoto: 'पहले फोटो जोड़ें', makesImages: 'चित्र बनाता है', photoNeeded: 'फोटो चाहिए', textOnly: 'केवल पाठ', languageLoadError: 'यह भाषा लोड नहीं हुई। कृपया फिर कोशिश करें।',
      copiedShort: 'कॉपी हो गया!', opened: 'खुल गया', toolOpenToast: '{tool} आपके प्रॉम्प्ट के साथ खुल रहा है। प्रॉम्प्ट कॉपी भी हो गया है—अगर फ़ोन ऐप में बॉक्स खाली हो, तो पेस्ट करें, [brackets] भरें और भेजें।', promptsNoun: 'प्रॉम्प्ट',
      synonymNotice: 'किसी प्रॉम्प्ट में “{query}” नाम से नहीं है, इसलिए उसी काम के प्रॉम्प्ट दिखाए जा रहे हैं। हर प्रॉम्प्ट किसी भी AI chat में काम करता है—पहले वहाँ पेस्ट करें।', pickStyle: 'एक स्टाइल चुनें + ', chooseStyles: '— {count} स्टाइल में से एक चुनें —', bestTool: 'सबसे अच्छा टूल', anyAIChat: 'कोई भी AI chat', reportProblem: 'इस प्रॉम्प्ट में समस्या बताएँ', outputFormat: 'आउटपुट प्रारूप',
      wordCopied: 'Word के लिए तैयार संस्करण कॉपी हुआ—इसे अपने AI में, फिर Word या Docs में पेस्ट करें।', pdfCopied: 'प्रिंट-तैयार PDF संस्करण कॉपी हुआ—इसे अपने AI में पेस्ट करके Print > Save as PDF चुनें।', pptCopied: 'स्लाइड-डेक संस्करण कॉपी हुआ—इसे अपने AI में, फिर PowerPoint, Slides, Canva या Gamma में पेस्ट करें।', copyTechnique: 'इस तकनीक को कॉपी करें', libraryPreparing: 'लाइब्रेरी अभी तैयार हो रही है। थोड़ी देर बाद पेज रीफ़्रेश करें।'
    },
    bn: {
      all: 'সব', saved: 'সংরক্ষিত', everyone: 'সবার জন্য', teachers: 'শিক্ষকদের জন্য', students: 'শিক্ষার্থীদের জন্য', allExams: 'সব পরীক্ষা',
      chooseSegment: 'আপনি কাদের পড়ান?', chooseJob: 'এখন কী তৈরি করতে চান?', ready: 'শুরু করার সেরা প্রম্পট', openFill: 'খুলুন এবং তথ্য পূরণ করুন',
      quickKicker: '৬০-সেকেন্ডে শুরু', quickTitle: 'পরের ক্লাসের জন্য আপনার কী দরকার?', quickSub: 'প্রথমে শ্রেণি বা পরীক্ষা বেছে নিন, তারপর কাজ। সঠিক প্রম্পট তথ্য পূরণের জন্য প্রস্তুত হয়ে খুলবে।', segmentSmall: 'এই পছন্দটি এই ডিভাইসে মনে রাখা হবে।', jobSmall: 'পেপার, সমাধান ও যাচাই, Worksheet, PPT অথবা Quiz।',
      quickHint: 'তিন ট্যাপ: বিভাগ, কাজ, তারপর খুলুন।', loading: 'সম্পূর্ণ প্রম্পট লোড হচ্ছে…', loadError: 'সম্পূর্ণ প্রম্পট লোড হয়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
      paper: 'পেপার', solveVerify: 'সমাধান + যাচাই', worksheet: 'Worksheet', ppt: 'PPT', quiz: 'Quiz', student: 'শিক্ষার্থী', foundation: 'Foundation',
      copyPrompt: 'প্রম্পট কপি করুন', howTo: 'কীভাবে ব্যবহার করবেন', share: 'শেয়ার করুন', save: 'সংরক্ষণ করুন', unsave: 'সংরক্ষিত তালিকা থেকে সরান',
      promptDay: 'আজকের প্রম্পট', recent: 'সম্প্রতি ব্যবহার করা', savedShelf: 'আপনার সংরক্ষিত প্রম্পট', important: 'সবচেয়ে গুরুত্বপূর্ণ', added: 'সম্প্রতি যোগ করা',
      showMore: 'আরও ৬০টি প্রম্পট দেখান', surprise: 'যেকোনো একটি প্রম্পট দেখান', browseAll: 'সব দেখুন', noMatch: 'কোনো প্রম্পট মেলেনি', related: 'সম্পর্কিত প্রম্পট', found: 'টি প্রম্পট পাওয়া গেছে',
      shareLead: 'বিনামূল্যের গণিত-শিক্ষণ প্রম্পট', copied: 'কপি হয়েছে! আপনার AI chat-এ paste করুন।', linkCopied: 'লিংক কপি হয়েছে—একজন শিক্ষককে পাঠান!',
      fillOptional: 'এখানে খালি অংশ পূরণ করুন', fillNote: 'আপনার তথ্য লিখুন—প্রম্পট ও বোতাম নিজে থেকেই বদলাবে।', close: 'বন্ধ করুন', copyLink: 'লিংক কপি করুন',
      formatAll: 'সব ফরম্যাট', effectiveTitle: 'এটি কার্যকরভাবে কীভাবে ব্যবহার করবেন', fixLabel: 'উত্তর ঠিক না হলে এটি পাঠান:', openOne: 'এক ক্লিকে খুলুন (প্রম্পট আপনার জন্য কপি হবে):', getAs: 'এই ফরম্যাটে নিন:', promptLabel: 'প্রম্পট কপি করুন',
      openChatGPT: 'ChatGPT-এ খুলুন', openClaude: 'Claude-এ খুলুন', searchPlaceholder: 'পেপার, integration, Wolfram, flashcards খুঁজুন...',
      freeAI: 'যেকোনো বিনামূল্যের AI-তে কাজ করে', needsImageAI: 'ছবি তৈরির AI দরকার', attachPhoto: 'আগে একটি ছবি যুক্ত করুন', makesImages: 'ছবি তৈরি করে', photoNeeded: 'ছবি দরকার', textOnly: 'শুধু টেক্সট', languageLoadError: 'ভাষাটি লোড হয়নি। আবার চেষ্টা করুন।',
      copiedShort: 'কপি হয়েছে!', opened: 'খোলা হয়েছে', toolOpenToast: '{tool} আপনার প্রম্পটসহ খুলছে। প্রম্পটটি কপিও হয়েছে—ফোন অ্যাপে বক্স খালি থাকলে paste করুন, [brackets] পূরণ করুন এবং পাঠান।', promptsNoun: 'প্রম্পট',
      synonymNotice: 'কোনো প্রম্পটে “{query}” নামটি নেই, তাই একই কাজের প্রম্পটগুলো দেখানো হচ্ছে। প্রতিটি প্রম্পট যেকোনো AI chat-এ কাজ করে—আগে সেখানে paste করুন।', pickStyle: 'একটি স্টাইল বেছে নিন + ', chooseStyles: '— {count}টি স্টাইলের একটি বেছে নিন —', bestTool: 'সেরা টুল', anyAIChat: 'যেকোনো AI chat', reportProblem: 'এই প্রম্পটের সমস্যা জানান', outputFormat: 'আউটপুট ফরম্যাট',
      wordCopied: 'Word-ready সংস্করণ কপি হয়েছে—আপনার AI-তে, তারপর Word বা Docs-এ paste করুন।', pdfCopied: 'প্রিন্ট-ready PDF সংস্করণ কপি হয়েছে—AI-তে paste করে Print > Save as PDF বেছে নিন।', pptCopied: 'স্লাইড-ডেক সংস্করণ কপি হয়েছে—AI-তে, তারপর PowerPoint, Slides, Canva বা Gamma-তে paste করুন।', copyTechnique: 'এই কৌশলটি কপি করুন', libraryPreparing: 'লাইব্রেরি এখনও প্রস্তুত হচ্ছে। একটু পরে পেজটি refresh করুন।'
    },
    mr: {
      all: 'सर्व', saved: 'जतन केलेले', everyone: 'सर्वांसाठी', teachers: 'शिक्षकांसाठी', students: 'विद्यार्थ्यांसाठी', allExams: 'सर्व परीक्षा',
      chooseSegment: 'आपण कोणाला शिकवता?', chooseJob: 'आता काय तयार करायचे?', ready: 'सुरुवातीसाठी योग्य प्रॉम्प्ट', openFill: 'उघडा आणि माहिती भरा',
      quickKicker: '६०-सेकंदात सुरुवात', quickTitle: 'पुढील वर्गासाठी आपल्याला काय हवे आहे?', quickSub: 'प्रथम वर्ग किंवा परीक्षा निवडा, मग काम. योग्य प्रॉम्प्ट माहिती भरण्यासाठी तयार उघडेल.', segmentSmall: 'ही निवड या डिव्हाइसवर लक्षात ठेवली जाईल.', jobSmall: 'पेपर, सोडवणे व तपासणी, Worksheet, PPT किंवा Quiz.',
      quickHint: 'तीन टॅप: विभाग, काम, मग उघडा.', loading: 'संपूर्ण प्रॉम्प्ट लोड होत आहे…', loadError: 'संपूर्ण प्रॉम्प्ट लोड झाला नाही. कनेक्शन तपासून पुन्हा प्रयत्न करा.',
      paper: 'पेपर', solveVerify: 'सोडवा + तपासा', worksheet: 'Worksheet', ppt: 'PPT', quiz: 'Quiz', student: 'विद्यार्थी', foundation: 'Foundation',
      copyPrompt: 'प्रॉम्प्ट कॉपी करा', howTo: 'हे कसे वापरावे', share: 'शेअर करा', save: 'जतन करा', unsave: 'जतन केलेल्यांतून काढा',
      promptDay: 'आजचा प्रॉम्प्ट', recent: 'अलीकडे वापरलेले', savedShelf: 'आपले जतन केलेले प्रॉम्प्ट', important: 'सर्वात महत्त्वाचे', added: 'अलीकडे जोडलेले',
      showMore: 'आणखी ६० प्रॉम्प्ट दाखवा', surprise: 'कोणताही एक प्रॉम्प्ट दाखवा', browseAll: 'सर्व पाहा', noMatch: 'जुळणारा प्रॉम्प्ट नाही', related: 'संबंधित प्रॉम्प्ट', found: 'प्रॉम्प्ट सापडले',
      shareLead: 'मोफत गणित-अध्यापन प्रॉम्प्ट', copied: 'कॉपी झाले! आपल्या AI chat मध्ये paste करा.', linkCopied: 'लिंक कॉपी झाली—एका शिक्षकाला पाठवा!',
      fillOptional: 'येथे रिकाम्या जागा भरा', fillNote: 'आपली माहिती लिहा—प्रॉम्प्ट आणि बटणे आपोआप बदलतील.', close: 'बंद करा', copyLink: 'लिंक कॉपी करा',
      formatAll: 'सर्व फॉरमॅट', effectiveTitle: 'हे परिणामकारकपणे कसे वापरावे', fixLabel: 'उत्तर योग्य नसेल तर हे पाठवा:', openOne: 'एका क्लिकमध्ये उघडा (प्रॉम्प्ट आपल्यासाठी कॉपी होईल):', getAs: 'या स्वरूपात मिळवा:', promptLabel: 'प्रॉम्प्ट कॉपी करा',
      openChatGPT: 'ChatGPT मध्ये उघडा', openClaude: 'Claude मध्ये उघडा', searchPlaceholder: 'पेपर, integration, Wolfram, flashcards शोधा...',
      freeAI: 'कोणत्याही मोफत AI वर चालते', needsImageAI: 'चित्र तयार करणारा AI हवा', attachPhoto: 'आधी फोटो जोडा', makesImages: 'चित्रे तयार करते', photoNeeded: 'फोटो हवा', textOnly: 'फक्त मजकूर', languageLoadError: 'ही भाषा लोड झाली नाही. पुन्हा प्रयत्न करा.',
      copiedShort: 'कॉपी झाले!', opened: 'उघडले', toolOpenToast: '{tool} आपला प्रॉम्प्ट घेऊन उघडत आहे. प्रॉम्प्ट कॉपीही झाला आहे—फोन app मध्ये बॉक्स रिकामा असल्यास paste करा, [brackets] भरा आणि पाठवा.', promptsNoun: 'प्रॉम्प्ट',
      synonymNotice: 'कोणत्याही प्रॉम्प्टमध्ये “{query}” हे नाव अजून नाही, म्हणून तेच काम करणारे प्रॉम्प्ट दाखवले आहेत. प्रत्येक प्रॉम्प्ट कोणत्याही AI chat मध्ये चालतो—आधी तिथे paste करा.', pickStyle: 'एक स्टाइल निवडा + ', chooseStyles: '— {count} स्टाइलपैकी एक निवडा —', bestTool: 'सर्वोत्तम टूल', anyAIChat: 'कोणताही AI chat', reportProblem: 'या प्रॉम्प्टमधील समस्या कळवा', outputFormat: 'आउटपुट फॉरमॅट',
      wordCopied: 'Word-ready आवृत्ती कॉपी झाली—ती आपल्या AI मध्ये, नंतर Word किंवा Docs मध्ये paste करा.', pdfCopied: 'प्रिंट-ready PDF आवृत्ती कॉपी झाली—AI मध्ये paste करून Print > Save as PDF निवडा.', pptCopied: 'स्लाइड-डेक आवृत्ती कॉपी झाली—AI मध्ये, नंतर PowerPoint, Slides, Canva किंवा Gamma मध्ये paste करा.', copyTechnique: 'हे तंत्र कॉपी करा', libraryPreparing: 'लायब्ररी अजून तयार होत आहे. थोड्या वेळाने पेज refresh करा.'
    },
    te: {
      all: 'అన్నీ', saved: 'సేవ్ చేసినవి', everyone: 'అందరికీ', teachers: 'ఉపాధ్యాయుల కోసం', students: 'విద్యార్థుల కోసం', allExams: 'అన్ని పరీక్షలు',
      chooseSegment: 'మీరు ఎవరికి బోధిస్తారు?', chooseJob: 'ఇప్పుడు ఏమి తయారు చేయాలి?', ready: 'ప్రారంభించడానికి సరైన ప్రాంప్ట్', openFill: 'తెరిచి వివరాలు పూరించండి',
      quickKicker: '60-సెకన్లలో ప్రారంభం', quickTitle: 'తదుపరి తరగతికి మీకు ఏమి కావాలి?', quickSub: 'ముందుగా తరగతి లేదా పరీక్షను ఎంచుకోండి, తరువాత పనిని ఎంచుకోండి. సరైన ప్రాంప్ట్ వివరాలు పూరించడానికి సిద్ధంగా తెరుచుకుంటుంది.', segmentSmall: 'ఈ ఎంపిక ఈ పరికరంలో గుర్తుంచుకోబడుతుంది.', jobSmall: 'పేపర్, పరిష్కారం మరియు తనిఖీ, Worksheet, PPT లేదా Quiz.',
      quickHint: 'మూడు ట్యాప్‌లు: విభాగం, పని, తరువాత తెరవండి.', loading: 'పూర్తి ప్రాంప్ట్ లోడ్ అవుతోంది…', loadError: 'పూర్తి ప్రాంప్ట్ లోడ్ కాలేదు. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
      paper: 'పేపర్', solveVerify: 'పరిష్కరించు + తనిఖీ', worksheet: 'Worksheet', ppt: 'PPT', quiz: 'Quiz', student: 'విద్యార్థి', foundation: 'Foundation',
      copyPrompt: 'ప్రాంప్ట్ కాపీ చేయండి', howTo: 'దీన్ని ఎలా ఉపయోగించాలి', share: 'షేర్ చేయండి', save: 'సేవ్ చేయండి', unsave: 'సేవ్ చేసిన వాటి నుంచి తొలగించండి',
      promptDay: 'ఈ రోజు ప్రాంప్ట్', recent: 'ఇటీవల ఉపయోగించినవి', savedShelf: 'మీ సేవ్ చేసిన ప్రాంప్ట్‌లు', important: 'అత్యంత ముఖ్యమైనవి', added: 'ఇటీవల జోడించినవి',
      showMore: 'మరో 60 ప్రాంప్ట్‌లు చూపండి', surprise: 'ఏదైనా ఒక ప్రాంప్ట్ చూపండి', browseAll: 'అన్నీ చూడండి', noMatch: 'సరిపోలే ప్రాంప్ట్ లేదు', related: 'సంబంధిత ప్రాంప్ట్‌లు', found: 'ప్రాంప్ట్‌లు దొరికాయి',
      shareLead: 'ఉచిత గణిత బోధన ప్రాంప్ట్', copied: 'కాపీ అయింది! మీ AI chat లో paste చేయండి.', linkCopied: 'లింక్ కాపీ అయింది—ఒక ఉపాధ్యాయుడికి పంపండి!',
      fillOptional: 'ఇక్కడ ఖాళీలను పూరించండి', fillNote: 'మీ వివరాలు టైప్ చేయండి—ప్రాంప్ట్ మరియు బటన్‌లు స్వయంచాలకంగా మారతాయి.', close: 'మూసివేయండి', copyLink: 'లింక్ కాపీ చేయండి',
      formatAll: 'అన్ని ఫార్మాట్‌లు', effectiveTitle: 'దీన్ని సమర్థంగా ఎలా ఉపయోగించాలి', fixLabel: 'సమాధానం సరైనది కాకపోతే ఇది పంపండి:', openOne: 'ఒక క్లిక్‌తో తెరవండి (ప్రాంప్ట్ మీ కోసం కాపీ అవుతుంది):', getAs: 'ఈ రూపంలో పొందండి:', promptLabel: 'ప్రాంప్ట్ కాపీ చేయండి',
      openChatGPT: 'ChatGPT లో తెరవండి', openClaude: 'Claude లో తెరవండి', searchPlaceholder: 'పేపర్లు, integration, Wolfram, flashcards వెతకండి...',
      freeAI: 'ఏ ఉచిత AI లోనైనా పనిచేస్తుంది', needsImageAI: 'చిత్రం తయారు చేసే AI కావాలి', attachPhoto: 'ముందుగా ఫోటో జోడించండి', makesImages: 'చిత్రాలు తయారు చేస్తుంది', photoNeeded: 'ఫోటో అవసరం', textOnly: 'టెక్స్ట్ మాత్రమే', languageLoadError: 'ఈ భాష లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి.',
      copiedShort: 'కాపీ అయింది!', opened: 'తెరవబడింది', toolOpenToast: '{tool} మీ ప్రాంప్ట్‌తో తెరుచుకుంటోంది. ప్రాంప్ట్ కాపీ కూడా అయింది—ఫోన్ app లో బాక్స్ ఖాళీగా ఉంటే paste చేసి, [brackets] పూరించి పంపండి.', promptsNoun: 'ప్రాంప్ట్‌లు',
      synonymNotice: 'ఏ ప్రాంప్ట్‌లోనూ “{query}” పేరు ఇంకా లేదు, కాబట్టి అదే పని చేసే ప్రాంప్ట్‌లు చూపిస్తున్నాం. ప్రతి ప్రాంప్ట్ ఏ AI chat లోనైనా పనిచేస్తుంది—ముందుగా అక్కడ paste చేయండి.', pickStyle: 'ఒక స్టైల్ ఎంచుకోండి + ', chooseStyles: '— {count} స్టైల్స్‌లో ఒకటి ఎంచుకోండి —', bestTool: 'ఉత్తమ టూల్', anyAIChat: 'ఏదైనా AI chat', reportProblem: 'ఈ ప్రాంప్ట్‌లో సమస్యను నివేదించండి', outputFormat: 'అవుట్‌పుట్ ఫార్మాట్',
      wordCopied: 'Word-ready వెర్షన్ కాపీ అయింది—మీ AI లో, తరువాత Word లేదా Docs లో paste చేయండి.', pdfCopied: 'ప్రింట్-ready PDF వెర్షన్ కాపీ అయింది—AI లో paste చేసి Print > Save as PDF ఎంచుకోండి.', pptCopied: 'స్లైడ్-డెక్ వెర్షన్ కాపీ అయింది—AI లో, తరువాత PowerPoint, Slides, Canva లేదా Gamma లో paste చేయండి.', copyTechnique: 'ఈ పద్ధతిని కాపీ చేయండి', libraryPreparing: 'లైబ్రరీ ఇంకా సిద్ధమవుతోంది. కొద్దిసేపటి తర్వాత పేజీని refresh చేయండి.'
    }
  };
  var STATIC_UI = {
    en: {
      brandHome: "Maths Prompt Studio home", navPrimary: "Primary navigation", navGuide: "Beginner's Guide", navBuilder: "Paper Builder", navLearn: "Learn 10×", navVerify: "Verify", navPrompts: "Prompts", navPlatform: "Platform", navAbout: "About", navFeedback: "Feedback", themeToggle: "Toggle dark mode", languagePicker: "Interface language", heroStart: "Make something in 60 seconds", heroBrowse: "Browse all 961 prompts", devicePhone: "📱 On a phone", deviceComputer: "💻 On a computer", verifyAnswer: "🔄 Double-check any AI answer",
      quickSegmentAria: "Choose teaching segment", quickJobAria: "Choose teaching job", quickInitial: "Start by choosing your class or exam above.", quickNoscript: "JavaScript is needed for the guided start. The complete prompt library remains available below.",
      learnKicker: "Study smarter, not harder", learnTitle: "Learn 10× with ChatGPT & Claude", learnSub: "The same AI that makes your materials can be the world's most patient private tutor—for you and your students. Tap any card to copy the technique.", learnFoot: "Share these with your students—an honest, AI-assisted study routine can multiply how fast anyone learns maths.", techniqueCopied: "Copied! Paste it into ChatGPT or Claude.",
      builderKicker: "No typing, no [brackets]", builderTitle: "The 3-Tap Exam-Paper Builder", builderSub: "Pick a few options and get a complete, ready-to-paste prompt. The AI then writes the whole paper with an answer key.", builderClass: "Class / Grade", builderBoard: "Board / Exam", builderType: "What to make", builderDifficulty: "Difficulty", builderChapters: "Chapters / topics to cover", builderChaptersPlaceholder: "e.g. Trigonometry, Quadratic Equations, Probability", builderMarks: "Total marks", builderTime: "Time", builderBuild: "✨ Build my prompt", builderReady: "YOUR READY-TO-USE PROMPT", builderTip: "💡 Tip: for an extra-safe answer key, paste the finished paper into a fresh chat and ask it to re-solve it as an unseen exam.",
      optionClass6: "Class 6", optionClass7: "Class 7", optionClass8: "Class 8", optionClass9: "Class 9", optionClass10: "Class 10", optionClass11: "Class 11", optionClass12: "Class 12", optionCollege: "College / University", optionStateBoard: "State Board", optionGeneral: "General", optionFullPaper: "Full question paper", optionUnitTest: "Unit test", optionSamplePaper: "Sample / model paper", optionDailyPractice: "Daily Practice (DPP)", optionMcqTest: "MCQ test", optionBalanced: "Balanced", optionEasyLeaning: "Easy-leaning", optionChallenging: "Challenging",
      libraryKicker: "The collection", libraryTitle: "The Prompt Library", librarySub: "Pick a group, search, open a card, and copy. Every card says whether it works on free AI and exactly how to use it.", searchAria: "Search prompts", clearSearch: "Clear search", groupLabel: "Group", groupAria: "Filter by group", facetAria: "Exam and audience filters", formatAria: "Output format filters", legendFree: "Works on any free AI", legendImages: "Makes images—needs an image AI", legendPhoto: "Attach a photo first", libraryTip: "Tip: every action button copies the prompt. If your AI opens empty, paste it, fill the brackets, and send.", loadingPrompts: "Loading {count} prompts…", suggestTerms: "graph|worksheet|quiz|lesson plan|formula sheet|photo|JEE|parents",
      feedbackKicker: "Your voice shapes this", feedbackTitle: "What should I fix or add next?", feedbackSub: "Rate the studio, leave a suggestion, or reach me directly. I prioritise the most-requested fixes first.", feedbackWorking: "How is it working for you?", rating: "Rating", starAria: "{count} stars", roleLabel: "I am a…", roleSchool: "School teacher", roleCoaching: "Coaching / tuition teacher", roleCollege: "College / university faculty", roleStudent: "Student", roleParent: "Parent", roleOther: "Other", feedbackMessage: "What's working, what's not, what should I add?", feedbackPlaceholder: "e.g. Please add more Class 9 geometry prompts, and improve image output.", feedbackName: "Your name (optional)", feedbackNamePlaceholder: "So I can thank you", sendFeedback: "✉️ Send feedback", copyInstead: "Copy instead", feedbackHint: "Tapping Send opens your email app with everything filled in—just press send.", reachTitle: "Reach me directly", reachSub: "Prefer a quick message? Use any of these.", emailMe: "✉️ Email me", openForm: "📝 Open suggestions form", messageWa: "📱 Message on WhatsApp", followInstagram: "📷 Follow on Instagram", promiseLabel: "My promise:", promise: "the most-requested fixes get done first. Your message can improve this for thousands of teachers.", feedbackSubject: "Maths Prompt Studio feedback", feedbackRatingField: "Rating", feedbackRoleField: "Role", feedbackNameField: "Name", feedbackBodyField: "Feedback", feedbackSentFrom: "Sent from Maths Prompt Studio", none: "none", emailOpened: "Your email app should have opened with everything filled in—just press send. Thank you!", feedbackCopied: "Feedback copied—paste it wherever you like.", whatsappLead: "Hello, feedback on Maths Prompt Studio:",
      shareKicker: "The only “payment” I ask", shareTitle: "Spread it to one more teacher or student", shareSub: "There is nothing to buy or download. If this saved you time, please pass it on to someone who can use it.", shareWhatsApp: "📱 Share on WhatsApp", shareMore: "➤ More…", shareMessage: "Free AI tool for maths teachers and students—{count} ready prompts plus a step-by-step beginner guide:", shareLinkCopied: "Link copied—send it to a teacher or student!", toastInitial: "Copied! Now go to your AI chat and paste it.", modalCloseAria: "Close"
    },
    hi: {
      brandHome: "Maths Prompt Studio होम", navPrimary: "मुख्य नेविगेशन", navGuide: "शुरुआती गाइड", navBuilder: "पेपर बिल्डर", navLearn: "10× सीखें", navVerify: "जाँचें", navPrompts: "प्रॉम्प्ट", navPlatform: "प्लेटफ़ॉर्म", navAbout: "परिचय", navFeedback: "फीडबैक", themeToggle: "डार्क मोड बदलें", languagePicker: "इंटरफ़ेस भाषा", heroStart: "60 सेकंड में कुछ बनाएँ", heroBrowse: "सभी 961 प्रॉम्प्ट देखें", devicePhone: "📱 फ़ोन पर", deviceComputer: "💻 कंप्यूटर पर", verifyAnswer: "🔄 किसी भी AI जवाब की दोबारा जाँच करें",
      quickSegmentAria: "शिक्षण वर्ग चुनें", quickJobAria: "शिक्षण काम चुनें", quickInitial: "ऊपर अपनी कक्षा या परीक्षा चुनकर शुरू करें।", quickNoscript: "मार्गदर्शित शुरुआत के लिए JavaScript चाहिए। पूरी प्रॉम्प्ट लाइब्रेरी नीचे उपलब्ध है।",
      learnKicker: "कम मेहनत में बेहतर पढ़ाई", learnTitle: "ChatGPT और Claude से 10× सीखें", learnSub: "जो AI आपकी सामग्री बनाता है, वही आपके और विद्यार्थियों के लिए धैर्यवान निजी शिक्षक बन सकता है। तकनीक कॉपी करने के लिए किसी कार्ड पर टैप करें।", learnFoot: "इन्हें विद्यार्थियों के साथ बाँटें—ईमानदार AI-सहायित अभ्यास गणित सीखने की गति बढ़ा सकता है।", techniqueCopied: "कॉपी हो गया! ChatGPT या Claude में पेस्ट करें।",
      builderKicker: "न टाइपिंग, न [brackets]", builderTitle: "3-टैप परीक्षा-पेपर बिल्डर", builderSub: "कुछ विकल्प चुनें और पूरा, पेस्ट-तैयार प्रॉम्प्ट पाएँ। AI उत्तर-कुंजी सहित पूरा पेपर लिखेगा।", builderClass: "कक्षा / स्तर", builderBoard: "बोर्ड / परीक्षा", builderType: "क्या बनाना है", builderDifficulty: "कठिनाई", builderChapters: "अध्याय / विषय", builderChaptersPlaceholder: "जैसे त्रिकोणमिति, द्विघात समीकरण, प्रायिकता", builderMarks: "कुल अंक", builderTime: "समय", builderBuild: "✨ मेरा प्रॉम्प्ट बनाएँ", builderReady: "आपका तैयार प्रॉम्प्ट", builderTip: "💡 सुझाव: सुरक्षित उत्तर-कुंजी के लिए तैयार पेपर को नई chat में पेस्ट करके अनदेखी परीक्षा की तरह दोबारा हल कराएँ।",
      optionClass6: "कक्षा 6", optionClass7: "कक्षा 7", optionClass8: "कक्षा 8", optionClass9: "कक्षा 9", optionClass10: "कक्षा 10", optionClass11: "कक्षा 11", optionClass12: "कक्षा 12", optionCollege: "कॉलेज / विश्वविद्यालय", optionStateBoard: "राज्य बोर्ड", optionGeneral: "सामान्य", optionFullPaper: "पूरा प्रश्नपत्र", optionUnitTest: "इकाई परीक्षा", optionSamplePaper: "नमूना / मॉडल पेपर", optionDailyPractice: "दैनिक अभ्यास (DPP)", optionMcqTest: "MCQ परीक्षा", optionBalanced: "संतुलित", optionEasyLeaning: "थोड़ा आसान", optionChallenging: "चुनौतीपूर्ण",
      libraryKicker: "संग्रह", libraryTitle: "प्रॉम्प्ट लाइब्रेरी", librarySub: "समूह चुनें, खोजें, कार्ड खोलें और कॉपी करें। हर कार्ड बताता है कि वह मुफ़्त AI पर चलेगा या नहीं और उसे कैसे इस्तेमाल करें।", searchAria: "प्रॉम्प्ट खोजें", clearSearch: "खोज साफ़ करें", groupLabel: "समूह", groupAria: "समूह के अनुसार फ़िल्टर", facetAria: "परीक्षा और उपयोगकर्ता फ़िल्टर", formatAria: "आउटपुट प्रारूप फ़िल्टर", legendFree: "किसी भी मुफ़्त AI पर काम करता है", legendImages: "चित्र बनाता है—image AI चाहिए", legendPhoto: "पहले फोटो जोड़ें", libraryTip: "सुझाव: हर action बटन प्रॉम्प्ट कॉपी करता है। AI खाली खुले तो पेस्ट करें, brackets भरें और भेजें।", loadingPrompts: "{count} प्रॉम्प्ट लोड हो रहे हैं…", suggestTerms: "ग्राफ|वर्कशीट|क्विज़|पाठ योजना|सूत्र पत्रक|फोटो|JEE|अभिभावक",
      feedbackKicker: "आपकी राय इसे बेहतर बनाती है", feedbackTitle: "अगला सुधार या जोड़ क्या हो?", feedbackSub: "रेटिंग दें, सुझाव लिखें या सीधे संपर्क करें। सबसे अधिक माँगे गए सुधार पहले किए जाते हैं।", feedbackWorking: "यह आपके लिए कैसा काम कर रहा है?", rating: "रेटिंग", starAria: "{count} सितारे", roleLabel: "मैं हूँ…", roleSchool: "स्कूल शिक्षक", roleCoaching: "कोचिंग / ट्यूशन शिक्षक", roleCollege: "कॉलेज / विश्वविद्यालय शिक्षक", roleStudent: "विद्यार्थी", roleParent: "अभिभावक", roleOther: "अन्य", feedbackMessage: "क्या अच्छा है, क्या नहीं, और क्या जोड़ना चाहिए?", feedbackPlaceholder: "जैसे कक्षा 9 ज्यामिति के और प्रॉम्प्ट जोड़ें और image output सुधारें।", feedbackName: "आपका नाम (वैकल्पिक)", feedbackNamePlaceholder: "ताकि मैं धन्यवाद कह सकूँ", sendFeedback: "✉️ फीडबैक भेजें", copyInstead: "कॉपी करें", feedbackHint: "Send दबाने पर भरा हुआ ईमेल खुलेगा—बस भेज दें।", reachTitle: "सीधे संपर्क करें", reachSub: "छोटा संदेश भेजना है? इनमें से कोई माध्यम चुनें।", emailMe: "✉️ ईमेल करें", openForm: "📝 सुझाव फ़ॉर्म खोलें", messageWa: "📱 WhatsApp पर संदेश", followInstagram: "📷 Instagram पर फ़ॉलो करें", promiseLabel: "मेरा वादा:", promise: "सबसे अधिक माँगे गए सुधार पहले होंगे। आपका संदेश हज़ारों शिक्षकों के काम आ सकता है।", feedbackSubject: "Maths Prompt Studio फीडबैक", feedbackRatingField: "रेटिंग", feedbackRoleField: "भूमिका", feedbackNameField: "नाम", feedbackBodyField: "फीडबैक", feedbackSentFrom: "Maths Prompt Studio से भेजा गया", none: "कोई नहीं", emailOpened: "भरी हुई जानकारी के साथ ईमेल ऐप खुल गया होगा—बस भेज दें। धन्यवाद!", feedbackCopied: "फीडबैक कॉपी हो गया—जहाँ चाहें पेस्ट करें।", whatsappLead: "नमस्ते, Maths Prompt Studio पर फीडबैक:",
      shareKicker: "बस इतना सहयोग चाहिए", shareTitle: "इसे एक और शिक्षक या विद्यार्थी तक पहुँचाएँ", shareSub: "न कुछ खरीदना है, न डाउनलोड करना। इससे समय बचा हो तो इसे किसी ज़रूरतमंद के साथ बाँटें।", shareWhatsApp: "📱 WhatsApp पर शेयर करें", shareMore: "➤ और…", shareMessage: "गणित शिक्षकों और विद्यार्थियों के लिए मुफ़्त AI टूल—{count} तैयार प्रॉम्प्ट और चरण-दर-चरण शुरुआती गाइड:", shareLinkCopied: "लिंक कॉपी हो गया—किसी शिक्षक या विद्यार्थी को भेजें!", toastInitial: "कॉपी हो गया! अब AI chat में जाकर पेस्ट करें।", modalCloseAria: "बंद करें"
    },
    bn: {
      brandHome: "Maths Prompt Studio হোম", navPrimary: "প্রধান নেভিগেশন", navGuide: "শুরুর গাইড", navBuilder: "পেপার বিল্ডার", navLearn: "10× শিখুন", navVerify: "যাচাই", navPrompts: "প্রম্পট", navPlatform: "প্ল্যাটফর্ম", navAbout: "পরিচিতি", navFeedback: "মতামত", themeToggle: "ডার্ক মোড বদলান", languagePicker: "ইন্টারফেসের ভাষা", heroStart: "60 সেকেন্ডে কিছু তৈরি করুন", heroBrowse: "সব 961টি প্রম্পট দেখুন", devicePhone: "📱 ফোনে", deviceComputer: "💻 কম্পিউটারে", verifyAnswer: "🔄 যেকোনো AI উত্তর দুবার যাচাই করুন",
      quickSegmentAria: "শিক্ষণ বিভাগ বেছে নিন", quickJobAria: "শিক্ষণ কাজ বেছে নিন", quickInitial: "উপরে শ্রেণি বা পরীক্ষা বেছে নিয়ে শুরু করুন।", quickNoscript: "নির্দেশিত শুরুর জন্য JavaScript দরকার। সম্পূর্ণ প্রম্পট লাইব্রেরি নিচে আছে।",
      learnKicker: "কম পরিশ্রমে আরও ভালো শেখা", learnTitle: "ChatGPT ও Claude দিয়ে 10× শিখুন", learnSub: "যে AI আপনার উপকরণ বানায়, সেটিই আপনার ও শিক্ষার্থীদের ধৈর্যশীল ব্যক্তিগত শিক্ষক হতে পারে। কৌশল কপি করতে কার্ডে ট্যাপ করুন।", learnFoot: "এগুলো শিক্ষার্থীদের সঙ্গে ভাগ করুন—সৎ AI-সহায়িত পড়াশোনা গণিত শেখার গতি বাড়াতে পারে।", techniqueCopied: "কপি হয়েছে! ChatGPT বা Claude-এ paste করুন।",
      builderKicker: "টাইপিং নয়, [brackets] নয়", builderTitle: "৩-ট্যাপ পরীক্ষার পেপার বিল্ডার", builderSub: "কয়েকটি বিকল্প বেছে সম্পূর্ণ paste-ready প্রম্পট নিন। AI উত্তরসূচিসহ পুরো পেপার লিখবে।", builderClass: "শ্রেণি / স্তর", builderBoard: "বোর্ড / পরীক্ষা", builderType: "কী বানাবেন", builderDifficulty: "কঠিনতা", builderChapters: "অধ্যায় / বিষয়", builderChaptersPlaceholder: "যেমন ত্রিকোণমিতি, দ্বিঘাত সমীকরণ, সম্ভাবনা", builderMarks: "মোট নম্বর", builderTime: "সময়", builderBuild: "✨ আমার প্রম্পট বানান", builderReady: "আপনার প্রস্তুত প্রম্পট", builderTip: "💡 পরামর্শ: নিরাপদ উত্তরসূচির জন্য তৈরি পেপারটি নতুন chat-এ paste করে অদেখা পরীক্ষা হিসেবে আবার সমাধান করতে বলুন।",
      optionClass6: "শ্রেণি ৬", optionClass7: "শ্রেণি ৭", optionClass8: "শ্রেণি ৮", optionClass9: "শ্রেণি ৯", optionClass10: "শ্রেণি ১০", optionClass11: "শ্রেণি ১১", optionClass12: "শ্রেণি ১২", optionCollege: "কলেজ / বিশ্ববিদ্যালয়", optionStateBoard: "রাজ্য বোর্ড", optionGeneral: "সাধারণ", optionFullPaper: "সম্পূর্ণ প্রশ্নপত্র", optionUnitTest: "ইউনিট টেস্ট", optionSamplePaper: "নমুনা / মডেল পেপার", optionDailyPractice: "দৈনিক অনুশীলন (DPP)", optionMcqTest: "MCQ পরীক্ষা", optionBalanced: "ভারসাম্যপূর্ণ", optionEasyLeaning: "কিছুটা সহজ", optionChallenging: "চ্যালেঞ্জিং",
      libraryKicker: "সংগ্রহ", libraryTitle: "প্রম্পট লাইব্রেরি", librarySub: "গ্রুপ বেছে নিন, খুঁজুন, কার্ড খুলুন ও কপি করুন। প্রতিটি কার্ড বলে এটি বিনামূল্যের AI-তে কাজ করবে কি না এবং কীভাবে ব্যবহার করবেন।", searchAria: "প্রম্পট খুঁজুন", clearSearch: "খোঁজ মুছুন", groupLabel: "গ্রুপ", groupAria: "গ্রুপ অনুযায়ী ফিল্টার", facetAria: "পরীক্ষা ও ব্যবহারকারী ফিল্টার", formatAria: "আউটপুট ফরম্যাট ফিল্টার", legendFree: "যেকোনো বিনামূল্যের AI-তে কাজ করে", legendImages: "ছবি তৈরি করে—image AI দরকার", legendPhoto: "আগে ছবি যুক্ত করুন", libraryTip: "পরামর্শ: প্রতিটি action বোতাম প্রম্পট কপি করে। AI খালি খুললে paste করুন, brackets পূরণ করে পাঠান।", loadingPrompts: "{count}টি প্রম্পট লোড হচ্ছে…", suggestTerms: "গ্রাফ|ওয়ার্কশিট|কুইজ|পাঠ পরিকল্পনা|সূত্রপত্র|ছবি|JEE|অভিভাবক",
      feedbackKicker: "আপনার মতামতেই এটি গড়ে ওঠে", feedbackTitle: "পরের বার কী ঠিক বা যোগ করা উচিত?", feedbackSub: "রেটিং দিন, পরামর্শ লিখুন বা সরাসরি যোগাযোগ করুন। সবচেয়ে বেশি চাওয়া সংশোধন আগে করা হয়।", feedbackWorking: "এটি আপনার জন্য কেমন কাজ করছে?", rating: "রেটিং", starAria: "{count}টি তারা", roleLabel: "আমি…", roleSchool: "স্কুল শিক্ষক", roleCoaching: "কোচিং / টিউশন শিক্ষক", roleCollege: "কলেজ / বিশ্ববিদ্যালয় শিক্ষক", roleStudent: "শিক্ষার্থী", roleParent: "অভিভাবক", roleOther: "অন্যান্য", feedbackMessage: "কী ভালো, কী নয়, আর কী যোগ করা উচিত?", feedbackPlaceholder: "যেমন শ্রেণি ৯ জ্যামিতির আরও প্রম্পট দিন এবং image output উন্নত করুন।", feedbackName: "আপনার নাম (ঐচ্ছিক)", feedbackNamePlaceholder: "যাতে ধন্যবাদ জানাতে পারি", sendFeedback: "✉️ মতামত পাঠান", copyInstead: "কপি করুন", feedbackHint: "Send চাপলে পূরণ করা email app খুলবে—শুধু পাঠিয়ে দিন।", reachTitle: "সরাসরি যোগাযোগ করুন", reachSub: "দ্রুত বার্তা দিতে চান? যেকোনোটি বেছে নিন।", emailMe: "✉️ email করুন", openForm: "📝 পরামর্শ ফর্ম খুলুন", messageWa: "📱 WhatsApp-এ বার্তা", followInstagram: "📷 Instagram-এ অনুসরণ করুন", promiseLabel: "আমার প্রতিশ্রুতি:", promise: "সবচেয়ে বেশি চাওয়া সংশোধন আগে হবে। আপনার একটি বার্তা হাজারো শিক্ষককে সাহায্য করতে পারে।", feedbackSubject: "Maths Prompt Studio মতামত", feedbackRatingField: "রেটিং", feedbackRoleField: "ভূমিকা", feedbackNameField: "নাম", feedbackBodyField: "মতামত", feedbackSentFrom: "Maths Prompt Studio থেকে পাঠানো", none: "কিছু নেই", emailOpened: "সব তথ্যসহ email app খোলার কথা—শুধু পাঠিয়ে দিন। ধন্যবাদ!", feedbackCopied: "মতামত কপি হয়েছে—যেখানে চান paste করুন।", whatsappLead: "নমস্কার, Maths Prompt Studio সম্পর্কে মতামত:",
      shareKicker: "শুধু এটুকুই অনুরোধ", shareTitle: "আরও একজন শিক্ষক বা শিক্ষার্থীর কাছে পৌঁছে দিন", shareSub: "কিছু কিনতে বা download করতে হবে না। সময় বাঁচলে এমন কারও সঙ্গে ভাগ করুন যার কাজে লাগবে।", shareWhatsApp: "📱 WhatsApp-এ শেয়ার করুন", shareMore: "➤ আরও…", shareMessage: "গণিত শিক্ষক ও শিক্ষার্থীদের বিনামূল্যের AI টুল—{count}টি প্রস্তুত প্রম্পট এবং ধাপে ধাপে শুরুর গাইড:", shareLinkCopied: "লিংক কপি হয়েছে—একজন শিক্ষক বা শিক্ষার্থীকে পাঠান!", toastInitial: "কপি হয়েছে! এখন AI chat-এ গিয়ে paste করুন।", modalCloseAria: "বন্ধ করুন"
    },
    mr: {
      brandHome: "Maths Prompt Studio होम", navPrimary: "मुख्य नेव्हिगेशन", navGuide: "नवशिक्यांसाठी मार्गदर्शक", navBuilder: "पेपर बिल्डर", navLearn: "10× शिका", navVerify: "तपासा", navPrompts: "प्रॉम्प्ट", navPlatform: "प्लॅटफॉर्म", navAbout: "माहिती", navFeedback: "अभिप्राय", themeToggle: "डार्क मोड बदला", languagePicker: "इंटरफेसची भाषा", heroStart: "60 सेकंदांत काहीतरी तयार करा", heroBrowse: "सर्व 961 प्रॉम्प्ट पाहा", devicePhone: "📱 फोनवर", deviceComputer: "💻 संगणकावर", verifyAnswer: "🔄 कोणतेही AI उत्तर पुन्हा तपासा",
      quickSegmentAria: "अध्यापन विभाग निवडा", quickJobAria: "अध्यापन काम निवडा", quickInitial: "वर आपला वर्ग किंवा परीक्षा निवडून सुरुवात करा.", quickNoscript: "मार्गदर्शित सुरुवातीसाठी JavaScript आवश्यक आहे. संपूर्ण प्रॉम्प्ट लायब्ररी खाली उपलब्ध आहे.",
      learnKicker: "कमी कष्टात अधिक हुशारीने शिका", learnTitle: "ChatGPT आणि Claude सोबत 10× शिका", learnSub: "आपले साहित्य बनवणारा AI आपला आणि विद्यार्थ्यांचा संयमी वैयक्तिक शिक्षकही होऊ शकतो. तंत्र कॉपी करण्यासाठी कार्डवर टॅप करा.", learnFoot: "ही तंत्रे विद्यार्थ्यांसोबत शेअर करा—प्रामाणिक AI-सहाय्यित अभ्यास गणित शिकण्याचा वेग वाढवू शकतो.", techniqueCopied: "कॉपी झाले! ChatGPT किंवा Claude मध्ये paste करा.",
      builderKicker: "टायपिंग नाही, [brackets] नाही", builderTitle: "3-टॅप परीक्षा-पेपर बिल्डर", builderSub: "काही पर्याय निवडा आणि पूर्ण paste-ready प्रॉम्प्ट मिळवा. AI उत्तरसूचीसह संपूर्ण पेपर लिहील.", builderClass: "वर्ग / स्तर", builderBoard: "बोर्ड / परीक्षा", builderType: "काय बनवायचे", builderDifficulty: "कठीणपणा", builderChapters: "धडे / विषय", builderChaptersPlaceholder: "उदा. त्रिकोणमिती, द्विघात समीकरणे, संभाव्यता", builderMarks: "एकूण गुण", builderTime: "वेळ", builderBuild: "✨ माझा प्रॉम्प्ट बनवा", builderReady: "आपला तयार प्रॉम्प्ट", builderTip: "💡 सूचना: अधिक सुरक्षित उत्तरसूचीसाठी तयार पेपर नवीन chat मध्ये paste करून तो न पाहिलेल्या परीक्षेसारखा पुन्हा सोडवायला सांगा.",
      optionClass6: "इयत्ता 6", optionClass7: "इयत्ता 7", optionClass8: "इयत्ता 8", optionClass9: "इयत्ता 9", optionClass10: "इयत्ता 10", optionClass11: "इयत्ता 11", optionClass12: "इयत्ता 12", optionCollege: "महाविद्यालय / विद्यापीठ", optionStateBoard: "राज्य बोर्ड", optionGeneral: "सामान्य", optionFullPaper: "पूर्ण प्रश्नपत्रिका", optionUnitTest: "घटक चाचणी", optionSamplePaper: "नमुना / मॉडेल पेपर", optionDailyPractice: "दैनिक सराव (DPP)", optionMcqTest: "MCQ चाचणी", optionBalanced: "संतुलित", optionEasyLeaning: "थोडा सोपा", optionChallenging: "आव्हानात्मक",
      libraryKicker: "संग्रह", libraryTitle: "प्रॉम्प्ट लायब्ररी", librarySub: "गट निवडा, शोधा, कार्ड उघडा आणि कॉपी करा. प्रत्येक कार्ड मोफत AI वर चालते का आणि कसे वापरायचे ते सांगते.", searchAria: "प्रॉम्प्ट शोधा", clearSearch: "शोध साफ करा", groupLabel: "गट", groupAria: "गटानुसार फिल्टर", facetAria: "परीक्षा आणि वापरकर्ता फिल्टर", formatAria: "आउटपुट फॉरमॅट फिल्टर", legendFree: "कोणत्याही मोफत AI वर चालते", legendImages: "चित्रे बनवते—image AI आवश्यक", legendPhoto: "आधी फोटो जोडा", libraryTip: "सूचना: प्रत्येक action बटण प्रॉम्प्ट कॉपी करते. AI रिकामे उघडल्यास paste करा, brackets भरा आणि पाठवा.", loadingPrompts: "{count} प्रॉम्प्ट लोड होत आहेत…", suggestTerms: "आलेख|वर्कशीट|क्विझ|पाठ योजना|सूत्रपत्र|फोटो|JEE|पालक",
      feedbackKicker: "आपल्या मताने हे घडते", feedbackTitle: "पुढे काय सुधारू किंवा जोडू?", feedbackSub: "रेटिंग द्या, सूचना लिहा किंवा थेट संपर्क करा. सर्वाधिक मागणीच्या सुधारणा आधी केल्या जातात.", feedbackWorking: "हे आपल्यासाठी कसे काम करत आहे?", rating: "रेटिंग", starAria: "{count} तारे", roleLabel: "मी आहे…", roleSchool: "शाळेतील शिक्षक", roleCoaching: "कोचिंग / शिकवणी शिक्षक", roleCollege: "महाविद्यालय / विद्यापीठ शिक्षक", roleStudent: "विद्यार्थी", roleParent: "पालक", roleOther: "इतर", feedbackMessage: "काय चांगले आहे, काय नाही आणि काय जोडावे?", feedbackPlaceholder: "उदा. इयत्ता 9 भूमितीसाठी अधिक प्रॉम्प्ट जोडा आणि image output सुधारा.", feedbackName: "आपले नाव (ऐच्छिक)", feedbackNamePlaceholder: "म्हणजे मी आभार मानू शकेन", sendFeedback: "✉️ अभिप्राय पाठवा", copyInstead: "कॉपी करा", feedbackHint: "Send दाबल्यावर भरलेले email app उघडेल—फक्त पाठवा.", reachTitle: "थेट संपर्क करा", reachSub: "झटपट संदेश हवा? यापैकी काहीही वापरा.", emailMe: "✉️ email करा", openForm: "📝 सूचना फॉर्म उघडा", messageWa: "📱 WhatsApp वर संदेश", followInstagram: "📷 Instagram वर फॉलो करा", promiseLabel: "माझे वचन:", promise: "सर्वाधिक मागणीच्या सुधारणा आधी होतील. आपला एक संदेश हजारो शिक्षकांना मदत करू शकतो.", feedbackSubject: "Maths Prompt Studio अभिप्राय", feedbackRatingField: "रेटिंग", feedbackRoleField: "भूमिका", feedbackNameField: "नाव", feedbackBodyField: "अभिप्राय", feedbackSentFrom: "Maths Prompt Studio मधून पाठवले", none: "काही नाही", emailOpened: "सर्व माहिती भरून email app उघडले असेल—फक्त पाठवा. धन्यवाद!", feedbackCopied: "अभिप्राय कॉपी झाला—हवे तिथे paste करा.", whatsappLead: "नमस्कार, Maths Prompt Studio बद्दल अभिप्राय:",
      shareKicker: "फक्त एवढीच मदत हवी", shareTitle: "आणखी एका शिक्षक किंवा विद्यार्थ्यापर्यंत पोहोचवा", shareSub: "काही विकत घ्यायचे किंवा download करायचे नाही. वेळ वाचला असेल तर उपयोग होईल अशा व्यक्तीला शेअर करा.", shareWhatsApp: "📱 WhatsApp वर शेअर करा", shareMore: "➤ अधिक…", shareMessage: "गणित शिक्षक आणि विद्यार्थ्यांसाठी मोफत AI टूल—{count} तयार प्रॉम्प्ट आणि टप्प्याटप्प्याचा मार्गदर्शक:", shareLinkCopied: "लिंक कॉपी झाली—शिक्षक किंवा विद्यार्थ्याला पाठवा!", toastInitial: "कॉपी झाले! आता AI chat मध्ये जाऊन paste करा.", modalCloseAria: "बंद करा"
    },
    te: {
      brandHome: "Maths Prompt Studio హోమ్", navPrimary: "ప్రధాన నావిగేషన్", navGuide: "ప్రారంభ మార్గదర్శిని", navBuilder: "పేపర్ బిల్డర్", navLearn: "10× నేర్చుకోండి", navVerify: "తనిఖీ", navPrompts: "ప్రాంప్ట్‌లు", navPlatform: "వేదిక", navAbout: "గురించి", navFeedback: "అభిప్రాయం", themeToggle: "డార్క్ మోడ్ మార్చండి", languagePicker: "ఇంటర్‌ఫేస్ భాష", heroStart: "60 సెకన్లలో ఏదైనా తయారు చేయండి", heroBrowse: "961 ప్రాంప్ట్‌లన్నింటినీ చూడండి", devicePhone: "📱 ఫోన్‌లో", deviceComputer: "💻 కంప్యూటర్‌లో", verifyAnswer: "🔄 ఏదైనా AI సమాధానాన్ని మళ్లీ తనిఖీ చేయండి",
      quickSegmentAria: "బోధనా విభాగాన్ని ఎంచుకోండి", quickJobAria: "బోధనా పనిని ఎంచుకోండి", quickInitial: "పైన మీ తరగతి లేదా పరీక్షను ఎంచుకుని ప్రారంభించండి.", quickNoscript: "మార్గదర్శక ప్రారంభానికి JavaScript అవసరం. పూర్తి ప్రాంప్ట్ లైబ్రరీ క్రింద అందుబాటులో ఉంది.",
      learnKicker: "కష్టంగా కాదు, తెలివిగా చదవండి", learnTitle: "ChatGPT మరియు Claude తో 10× నేర్చుకోండి", learnSub: "మీ సామగ్రిని తయారు చేసే AI మీకు, మీ విద్యార్థులకు సహనమున్న వ్యక్తిగత ఉపాధ్యాయుడిగా కూడా మారగలదు. పద్ధతిని కాపీ చేయడానికి కార్డ్‌ను తాకండి.", learnFoot: "వీటిని విద్యార్థులతో పంచుకోండి—నిజాయితీగల AI-సహాయక అధ్యయనం గణితం నేర్చుకునే వేగాన్ని పెంచగలదు.", techniqueCopied: "కాపీ అయింది! ChatGPT లేదా Claude లో paste చేయండి.",
      builderKicker: "టైపింగ్ లేదు, [brackets] లేదు", builderTitle: "3-ట్యాప్ పరీక్ష పేపర్ బిల్డర్", builderSub: "కొన్ని ఎంపికలు చేసి పూర్తి paste-ready ప్రాంప్ట్ పొందండి. AI సమాధాన కీతో మొత్తం పేపర్‌ను రాస్తుంది.", builderClass: "తరగతి / స్థాయి", builderBoard: "బోర్డు / పరీక్ష", builderType: "ఏమి తయారు చేయాలి", builderDifficulty: "కఠినత", builderChapters: "అధ్యాయాలు / అంశాలు", builderChaptersPlaceholder: "ఉదా. త్రికోణమితి, ద్విఘాత సమీకరణాలు, సంభావ్యత", builderMarks: "మొత్తం మార్కులు", builderTime: "సమయం", builderBuild: "✨ నా ప్రాంప్ట్ తయారు చేయండి", builderReady: "మీ సిద్ధమైన ప్రాంప్ట్", builderTip: "💡 చిట్కా: మరింత సురక్షితమైన సమాధాన కీ కోసం తయారైన పేపర్‌ను కొత్త chat లో paste చేసి చూడని పరీక్షలా మళ్లీ పరిష్కరించమని అడగండి.",
      optionClass6: "6వ తరగతి", optionClass7: "7వ తరగతి", optionClass8: "8వ తరగతి", optionClass9: "9వ తరగతి", optionClass10: "10వ తరగతి", optionClass11: "11వ తరగతి", optionClass12: "12వ తరగతి", optionCollege: "కళాశాల / విశ్వవిద్యాలయం", optionStateBoard: "రాష్ట్ర బోర్డు", optionGeneral: "సాధారణ", optionFullPaper: "పూర్తి ప్రశ్నపత్రం", optionUnitTest: "యూనిట్ పరీక్ష", optionSamplePaper: "నమూనా / మోడల్ పేపర్", optionDailyPractice: "రోజువారీ అభ్యాసం (DPP)", optionMcqTest: "MCQ పరీక్ష", optionBalanced: "సమతుల్యం", optionEasyLeaning: "కొంచెం సులభం", optionChallenging: "సవాలుతో కూడినది",
      libraryKicker: "సేకరణ", libraryTitle: "ప్రాంప్ట్ లైబ్రరీ", librarySub: "గ్రూప్ ఎంచుకోండి, వెతకండి, కార్డ్ తెరిచి కాపీ చేయండి. ప్రతి కార్డ్ ఉచిత AI లో పనిచేస్తుందా, ఎలా వాడాలో చెబుతుంది.", searchAria: "ప్రాంప్ట్‌లను వెతకండి", clearSearch: "వెతుకులాటను తొలగించండి", groupLabel: "గ్రూప్", groupAria: "గ్రూప్ ఆధారంగా ఫిల్టర్", facetAria: "పరీక్ష మరియు వినియోగదారు ఫిల్టర్లు", formatAria: "అవుట్‌పుట్ ఫార్మాట్ ఫిల్టర్లు", legendFree: "ఏ ఉచిత AI లోనైనా పనిచేస్తుంది", legendImages: "చిత్రాలు తయారు చేస్తుంది—image AI కావాలి", legendPhoto: "ముందుగా ఫోటో జోడించండి", libraryTip: "చిట్కా: ప్రతి action బటన్ ప్రాంప్ట్‌ను కాపీ చేస్తుంది. AI ఖాళీగా తెరుచుకుంటే paste చేసి, brackets పూరించి పంపండి.", loadingPrompts: "{count} ప్రాంప్ట్‌లు లోడ్ అవుతున్నాయి…", suggestTerms: "గ్రాఫ్|వర్క్‌షీట్|క్విజ్|పాఠ ప్రణాళిక|సూత్ర పత్రం|ఫోటో|JEE|తల్లిదండ్రులు",
      feedbackKicker: "మీ అభిప్రాయమే దీనిని తీర్చిదిద్దుతుంది", feedbackTitle: "తర్వాత ఏమి సరిచేయాలి లేదా జోడించాలి?", feedbackSub: "రేటింగ్ ఇవ్వండి, సూచన రాయండి లేదా నేరుగా సంప్రదించండి. ఎక్కువగా కోరిన సవరణలు ముందుగా చేస్తాను.", feedbackWorking: "ఇది మీకు ఎలా పనిచేస్తోంది?", rating: "రేటింగ్", starAria: "{count} నక్షత్రాలు", roleLabel: "నేను…", roleSchool: "పాఠశాల ఉపాధ్యాయుడు", roleCoaching: "కోచింగ్ / ట్యూషన్ ఉపాధ్యాయుడు", roleCollege: "కళాశాల / విశ్వవిద్యాలయ అధ్యాపకుడు", roleStudent: "విద్యార్థి", roleParent: "తల్లిదండ్రి", roleOther: "ఇతర", feedbackMessage: "ఏది బాగుంది, ఏది లేదు, ఏమి జోడించాలి?", feedbackPlaceholder: "ఉదా. 9వ తరగతి జ్యామితికి మరిన్ని ప్రాంప్ట్‌లు జోడించి image output మెరుగుపరచండి.", feedbackName: "మీ పేరు (ఐచ్ఛికం)", feedbackNamePlaceholder: "మీకు ధన్యవాదాలు చెప్పడానికి", sendFeedback: "✉️ అభిప్రాయం పంపండి", copyInstead: "కాపీ చేయండి", feedbackHint: "Send నొక్కితే వివరాలతో email app తెరుచుకుంటుంది—పంపండి.", reachTitle: "నేరుగా సంప్రదించండి", reachSub: "త్వరగా సందేశం పంపాలా? వీటిలో ఏదైనా ఉపయోగించండి.", emailMe: "✉️ email చేయండి", openForm: "📝 సూచనల ఫారం తెరవండి", messageWa: "📱 WhatsApp లో సందేశం", followInstagram: "📷 Instagram లో అనుసరించండి", promiseLabel: "నా హామీ:", promise: "ఎక్కువగా కోరిన సవరణలు ముందుగా జరుగుతాయి. మీ సందేశం వేలాది ఉపాధ్యాయులకు సహాయపడగలదు.", feedbackSubject: "Maths Prompt Studio అభిప్రాయం", feedbackRatingField: "రేటింగ్", feedbackRoleField: "పాత్ర", feedbackNameField: "పేరు", feedbackBodyField: "అభిప్రాయం", feedbackSentFrom: "Maths Prompt Studio నుంచి పంపబడింది", none: "ఏదీ లేదు", emailOpened: "అన్ని వివరాలతో email app తెరుచుకుని ఉండాలి—పంపండి. ధన్యవాదాలు!", feedbackCopied: "అభిప్రాయం కాపీ అయింది—ఎక్కడ కావాలంటే అక్కడ paste చేయండి.", whatsappLead: "నమస్కారం, Maths Prompt Studio పై అభిప్రాయం:",
      shareKicker: "నేను కోరే చిన్న సహాయం", shareTitle: "మరొక ఉపాధ్యాయుడు లేదా విద్యార్థికి పంచండి", shareSub: "కొనాల్సింది, download చేయాల్సింది ఏమీ లేదు. ఇది సమయం ఆదా చేస్తే ఉపయోగపడే వ్యక్తికి పంపండి.", shareWhatsApp: "📱 WhatsApp లో షేర్ చేయండి", shareMore: "➤ మరిన్ని…", shareMessage: "గణిత ఉపాధ్యాయులు, విద్యార్థుల కోసం ఉచిత AI టూల్—{count} సిద్ధమైన ప్రాంప్ట్‌లు మరియు దశలవారీ ప్రారంభ గైడ్:", shareLinkCopied: "లింక్ కాపీ అయింది—ఉపాధ్యాయుడు లేదా విద్యార్థికి పంపండి!", toastInitial: "కాపీ అయింది! ఇప్పుడు AI chat లోకి వెళ్లి paste చేయండి.", modalCloseAria: "మూసివేయండి"
    }
  };
  Object.keys(STATIC_UI).forEach(function (code) { Object.keys(STATIC_UI[code]).forEach(function (key) { UI[code][key] = STATIC_UI[code][key]; }); });
  function assertUiDictionary() {
    var reference = Object.keys(UI.en).sort().join('|');
    ['en', 'hi', 'bn', 'mr', 'te'].forEach(function (code) {
      if (!UI[code] || Object.keys(UI[code]).sort().join('|') !== reference) throw new Error('UI dictionary mismatch: ' + code);
    });
  }
  function tr(key) {
    var dictionary = UI[state.lang];
    if (!dictionary || !Object.prototype.hasOwnProperty.call(dictionary, key)) return state.lang === 'en' ? (UI.en[key] || key) : '';
    return dictionary[key];
  }
  function trf(key, values) {
    var value = tr(key);
    Object.keys(values || {}).forEach(function (name) { value = value.split('{' + name + '}').join(values[name]); });
    return value;
  }
  function applyStaticChrome() {
    document.querySelectorAll('[data-i18n]').forEach(function (node) { node.textContent = tr(node.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (node) { node.setAttribute('placeholder', tr(node.getAttribute('data-i18n-placeholder'))); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (node) { node.setAttribute('aria-label', tr(node.getAttribute('data-i18n-aria'))); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (node) { node.setAttribute('title', tr(node.getAttribute('data-i18n-title'))); });
    document.querySelectorAll('[data-i18n-count]').forEach(function (node) { node.textContent = trf(node.getAttribute('data-i18n-count'), { count: ALL.length }); });
    document.querySelectorAll('#fbStars .star').forEach(function (node) { node.setAttribute('aria-label', trf('starAria', { count: node.getAttribute('data-v') })); });
    var emailLink = document.getElementById('fbEmailLink');
    if (emailLink && CFG.email) emailLink.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent(tr('feedbackSubject'));
    var whatsappLink = document.getElementById('fbWaLink');
    if (whatsappLink && CFG.whatsapp) whatsappLink.href = 'https://wa.me/' + String(CFG.whatsapp).replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(tr('whatsappLead') + ' ');
  }
  function localLabel(item) { return item[state.lang] || item.en || item.id || ''; }
  var GROUP_LABELS = CATALOG.groupI18n || {
    'Solving & Checking': { en: 'Solving & Checking', hi: 'हल और जाँच', bn: 'সমাধান ও যাচাই', mr: 'सोडवणे आणि तपासणी', te: 'పరిష్కారం మరియు తనిఖీ' },
    'Practice & Assessment': { en: 'Practice & Assessment', hi: 'अभ्यास और मूल्यांकन', bn: 'অনুশীলন ও মূল্যায়ন', mr: 'सराव आणि मूल्यांकन', te: 'అభ్యాసం మరియు మూల్యాంకనం' },
    'Teaching Materials': { en: 'Teaching Materials', hi: 'शिक्षण सामग्री', bn: 'শিক্ষণ সামগ্রী', mr: 'अध्यापन साहित्य', te: 'బోధనా సామగ్రి' },
    'Writing & Content': { en: 'Writing & Content', hi: 'लेखन और सामग्री', bn: 'লেখা ও বিষয়বস্তু', mr: 'लेखन आणि आशय', te: 'రచన మరియు కంటెంట్' },
    Engagement: { en: 'Engagement', hi: 'सहभागिता', bn: 'অংশগ্রহণ', mr: 'सहभाग', te: 'పాల్గొనడం' },
    Support: { en: 'Support', hi: 'सहायता', bn: 'সহায়তা', mr: 'सहाय्य', te: 'సహాయం' },
    'Teacher Productivity': { en: 'Teacher Productivity', hi: 'शिक्षक उत्पादकता', bn: 'শিক্ষকের উৎপাদনশীলতা', mr: 'शिक्षक उत्पादकता', te: 'ఉపాధ్యాయ ఉత్పాదకత' }
  };
  function groupLabel(group) { return localLabel(GROUP_LABELS[group] || { en: group }); }
  var CATEGORY_LABELS = CATALOG.categoryI18n || {};
  function categoryLabel(category) {
    var labels = CATEGORY_LABELS[typeof category === 'string' ? category : category.category];
    return labels ? localLabel(labels) : (typeof category === 'string' ? category : category.categoryTitle);
  }

  /* A selected non-English language is complete by construction. Missing
     translated fields therefore fail closed instead of leaking English. */
  function T(p, field) {
    if (state.lang === 'en') return p[field];
    if (!isLanguageLive(state.lang) || !p[state.lang] || p[state.lang][field] == null) return Array.isArray(p[field]) ? [] : '';
    return p[state.lang][field];
  }
  function applyCatalogLanguage(lang) {
    if (!isLanguageLive(lang) || lang === 'en') return lang === 'en';
    var packs = window.PROMPT_CATALOG_LANG || {};
    var pack = packs[lang];
    if (!pack) return false;
    var slugs = Object.keys(pack);
    if (slugs.length !== ALL.length || !ALL.every(function (prompt) {
      var value = pack[prompt.slug];
      return value && value.title && value.whatYouGet && typeof value.searchText === 'string' && value.searchText;
    })) return false;
    slugs.forEach(function (slug) { ALL_BY_SLUG[slug][lang] = pack[slug]; });
    return true;
  }
  function ensureCatalogLanguage(lang) {
    if (!isLanguageLive(lang)) return Promise.reject(new Error('language is incomplete'));
    if (lang === 'en' || applyCatalogLanguage(lang)) return Promise.resolve(true);
    if (catalogLanguagePromises[lang]) return catalogLanguagePromises[lang];
    catalogLanguagePromises[lang] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'data/catalog-' + lang + '.js?v=26';
      script.onload = function () { if (applyCatalogLanguage(lang)) resolve(true); else reject(new Error('missing language pack')); };
      script.onerror = function () { reject(new Error('language pack request failed')); };
      document.head.appendChild(script);
    }).catch(function (error) { catalogLanguagePromises[lang] = null; showToast(tr('languageLoadError')); throw error; });
    return catalogLanguagePromises[lang];
  }
  function refreshLanguageView() {
    applyStaticChrome();
    var search = document.getElementById('search'); if (search) search.placeholder = tr('searchPlaceholder');
    buildChips(); buildFacets(); buildFormatFacets(); buildQuickStart(); renderLearn(); render();
  }
  function commitLanguage(lang) {
    if (!isLanguageLive(lang)) return false;
    state.lang = lang;
    try { localStorage.setItem('mps-lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-chip').forEach(function (b) { var active = b.getAttribute('data-lang') === lang; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    refreshLanguageView();
    return true;
  }
  function setLang(lang) {
    if (!isLanguageLive(lang)) return Promise.resolve(false);
    if (lang === 'en' || applyCatalogLanguage(lang)) { commitLanguage(lang); return Promise.resolve(true); }
    return ensureCatalogLanguage(lang).then(function () { commitLanguage(lang); return true; }).catch(function () { return false; });
  }

  function indexFullData(data) {
    fullBySlug = Object.create(null);
    (data.categories || []).forEach(function (cat) {
      (cat.prompts || []).forEach(function (p, i) {
        p._cat = cat.category; p._catTitle = cat.categoryTitle; p._catIcon = cat.categoryIcon || ''; p._group = cat.group || 'More'; p._id = cat.category + '-' + i;
        fullBySlug[p.slug] = p;
      });
    });
    return data;
  }
  if (FULL_DATA) indexFullData(FULL_DATA);

  function hasCompleteActivePrompt(prompt) {
    if (!prompt || state.lang === 'en') return !!(prompt && prompt.promptText);
    if (!isLanguageLive(state.lang)) return false;
    var value = prompt[state.lang];
    return !!(value && ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText'].every(function (field) { return typeof value[field] === 'string' && value[field].trim(); }) && Array.isArray(value.effectiveUsage));
  }

  function loadFullData() {
    if (FULL_DATA && fullBySlug) return Promise.resolve(FULL_DATA);
    if (window.PROMPT_DATA && window.PROMPT_DATA.categories) { FULL_DATA = window.PROMPT_DATA; return Promise.resolve(indexFullData(FULL_DATA)); }
    if (fullDataPromise) return fullDataPromise;
    fullDataPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = window.MPS_DATA_URL || 'data/prompts.js?v=26';
      script.async = true;
      script.onload = function () {
        if (!window.PROMPT_DATA || !window.PROMPT_DATA.categories) { reject(new Error('prompt data did not initialise')); return; }
        FULL_DATA = window.PROMPT_DATA; resolve(indexFullData(FULL_DATA));
      };
      script.onerror = function () { reject(new Error('prompt data request failed')); };
      document.head.appendChild(script);
    }).catch(function (error) { fullDataPromise = null; throw error; });
    return fullDataPromise;
  }

  function withFullPrompt(card, action) {
    if (!card) return Promise.resolve(null);
    if (card.promptText && hasCompleteActivePrompt(card)) { action(card); return Promise.resolve(card); }
    showToast(tr('loading'));
    return loadFullData().then(function () {
      var full = fullBySlug && fullBySlug[card.slug];
      if (!full) throw new Error('prompt not found: ' + card.slug);
      if (!hasCompleteActivePrompt(full)) throw new Error('active-language prompt is incomplete: ' + card.slug);
      action(full); return full;
    }).catch(function () { showToast(tr('loadError')); return null; });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  /* ---------- clipboard + toast ---------- */
  var toastT;
  function showToast(msg) { var t = document.getElementById('toast'); if (!t) return; if (msg) t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 3000); }
  function legacyCopy(text) { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }
  function clip(text) { try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); }); } catch (e) {} legacyCopy(text); return Promise.resolve(); }
  function copyBtn(btn, label) { if (!btn) return; var o = btn.getAttribute('data-lbl') || btn.innerHTML; btn.setAttribute('data-lbl', o); btn.innerHTML = label || ('&#10003; ' + esc(tr('copiedShort'))); btn.classList.add('done'); setTimeout(function () { btn.innerHTML = o; btn.classList.remove('done'); }, 1900); }
  function copyText(text, btn, okMsg) { clip(text).then(function () { copyBtn(btn); showToast(okMsg); }); }

  /* ---------- export formats ---------- */
  var FMT = {
    word: '\n\n----------\nFORMAT THE OUTPUT: After solving, present your ENTIRE response as a clean document ready to paste straight into Microsoft Word or Google Docs - use a bold title, clear section headings, bold key terms, neatly numbered steps, and tables where helpful. Keep all mathematics fully readable. If a "Prepared by" footer is present, keep it.',
    pdf: '\n\n----------\nFORMAT THE OUTPUT: After solving, lay out your ENTIRE response as a clean, print-ready A4 page I can save as PDF (File > Print > Save as PDF) - a clear title, well-spaced headings, numbered sections and generous margins. Keep all mathematics fully readable. If a "Prepared by" footer is present, keep it.',
    ppt: '\n\n----------\nFORMAT THE OUTPUT: After solving, turn your ENTIRE response into a slide-by-slide deck for PowerPoint, Google Slides, Canva or Gamma. For each slide give "Slide N - Title", then 3 to 5 short bullet points, then a "Speaker notes:" line. Begin with a title slide and end with a summary slide. Put the "Compiled by" line from the prompt (if any) on the title slide.'
  };
  var FMT_MSG = { word: 'wordCopied', pdf: 'pdfCopied', ppt: 'pptCopied' };
  function copyFormatted(text, kind, btn) { copyText(text + (FMT[kind] || ''), btn, tr(FMT_MSG[kind])); }

  /* ---------- open in tool ---------- */
  function openTool(text, tool, btn) {
    // Try to pre-fill via ?q= (works on ChatGPT/Gemini web; Claude may ignore it). ALWAYS copy too,
    // so it works on phone apps that ignore the URL: the toast tells the teacher to paste if empty.
    var base = tool === 'claude' ? 'https://claude.ai/new' : 'https://chatgpt.com/';
    var name = tool === 'claude' ? 'Claude' : 'ChatGPT';
    var full = base + '?q=' + encodeURIComponent(text);
    var url = full.length <= 7000 ? full : base; // very long prompts -> open bare + rely on clipboard
    clip(text).then(function () {
      try { window.open(url, '_blank', 'noopener'); } catch (e) { location.href = url; }
      copyBtn(btn, '&#10003; ' + esc(tr('opened')));
      showToast(trf('toolOpenToast', { tool: name }));
    });
  }

  /* ---------- stats ---------- */
  function setStats() {
    var styleCat = DATA.find(function (c) { return c.category === 'handwritten-styles'; });
    var styleCount = styleCat ? styleCat.prompts.reduce(function (max, p) { return Math.max(max, (p.styles || []).length, p.styleCount || 0); }, 0) : 0;
    if (!styleCount) styleCount = 18;
    var map = { prompts: ALL.length + '+', cats: DATA.length, styles: styleCount };
    document.querySelectorAll('[data-stat]').forEach(function (n) { var k = n.getAttribute('data-stat'); if (map[k] != null) n.textContent = map[k]; });
  }

  /* ---------- group chips ---------- */
  function buildChips() {
    var wrap = document.getElementById('groupChips'); if (!wrap) return; wrap.innerHTML = '';
    // AUD-C P1/C1: Saved is a first-class local shelf, never an account feature.
    var savedCount = ALL.filter(function (p) { return favorites.has(p.slug); }).length;
    var chips = [{ id: 'all', title: tr('all'), ct: ALL.length }, { id: 'saved', title: tr('saved'), ct: savedCount }];
    GROUPS.forEach(function (g) { chips.push({ id: g, title: groupLabel(g), ct: DATA.filter(function (c) { return c.group === g; }).reduce(function (t, c) { return t + (c.prompts || []).length; }, 0) }); });
    chips.forEach(function (c) {
      var b = el('<button class="fchip' + (c.id === state.group ? ' active' : '') + '" type="button" aria-pressed="' + (c.id === state.group) + '">' + esc(c.title) + ' <span class="fchip-ct">' + c.ct + '</span></button>');
      b.addEventListener('click', function () { state.group = c.id; state.renderLimit = 60; document.querySelectorAll('#groupChips .fchip').forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); }); b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); render(); var lib = document.getElementById('library'); if (lib) lib.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      wrap.appendChild(b);
    });
  }

  /* ---------- facet filters: exam + audience ---------- */
  var EXAMS = [
    { id: 'all', en: 'All exams', hi: 'सभी परीक्षाएँ', bn: 'সব পরীক্ষা', mr: 'सर्व परीक्षा', te: 'అన్ని పరీక్షలు' },
    { id: 'boards', en: 'Boards', hi: 'बोर्ड', bn: 'বোর্ড', mr: 'बोर्ड', te: 'బోర్డులు' },
    { id: 'jee-main', en: 'JEE Main', hi: 'JEE Main', bn: 'JEE Main', mr: 'JEE Main', te: 'JEE Main' },
    { id: 'jee-advanced', en: 'JEE Advanced', hi: 'JEE Advanced', bn: 'JEE Advanced', mr: 'JEE Advanced', te: 'JEE Advanced' },
    { id: 'olympiad', en: 'Olympiad', hi: 'ओलंपियाड', bn: 'Olympiad', mr: 'Olympiad', te: 'Olympiad' },
    { id: 'foundation', en: 'Foundation (6-8)', hi: 'फ़ाउंडेशन (6-8)', bn: 'Foundation (6-8)', mr: 'Foundation (6-8)', te: 'Foundation (6-8)' }
  ];
  var AUDS = [
    { id: 'all', en: 'Everyone', hi: 'सबके लिए', bn: 'সবার জন্য', mr: 'सर्वांसाठी', te: 'అందరికీ' },
    { id: 'teacher', en: 'For teachers', hi: 'शिक्षकों के लिए', bn: 'শিক্ষকদের জন্য', mr: 'शिक्षकांसाठी', te: 'ఉపాధ్యాయుల కోసం' },
    { id: 'student', en: 'For students', hi: 'छात्रों के लिए', bn: 'শিক্ষার্থীদের জন্য', mr: 'विद्यार्थ्यांसाठी', te: 'విద్యార్థుల కోసం' }
  ];
  function buildFacets() {
    var chips = document.getElementById('groupChips'); if (!chips) return;
    var mount = document.getElementById('facetMount');
    if (!mount) {
      mount = document.getElementById('facetChips');
      if (!mount) { mount = el('<div id="facetMount"></div>'); chips.parentNode.insertBefore(mount, chips.nextSibling); }
    }
    mount.innerHTML = '';
    var wrap = el('<div class="fchips" id="facetChips"></div>');
    function addChip(list, key, item) {
      var n = item.id === 'all' ? null : ALL.filter(function (p) { return key === 'exam' ? (p.exams || []).indexOf(item.id) !== -1 : (p.aud === item.id || p.aud === 'both'); }).length;
      var label = item.id === 'all' ? (key === 'exam' ? tr('allExams') : tr('everyone')) : localLabel(item);
      var b = el('<button class="fchip' + (state[key] === item.id ? ' active' : '') + '" type="button" aria-pressed="' + (state[key] === item.id) + '">' + esc(label) + (n != null ? ' <span class="fchip-ct">' + n + '</span>' : '') + '</button>');
      b.addEventListener('click', function () { state[key] = item.id; state.renderLimit = 60; buildFacets(); render(); });
      wrap.appendChild(b);
    }
    EXAMS.forEach(function (x) { addChip(EXAMS, 'exam', x); });
    var sep = el('<span style="display:inline-block;width:14px"></span>'); wrap.appendChild(sep);
    AUDS.forEach(function (x) { addChip(AUDS, 'aud', x); });
    mount.appendChild(wrap);
  }

  var FORMATS = [
    { id: 'all', ic: '', en: 'All formats', hi: 'सभी प्रारूप', bn: 'সব ফরম্যাট', mr: 'सर्व फॉरमॅट', te: 'అన్ని ఫార్మాట్‌లు' },
    { id: 'pdf-print', ic: '&#128424;&#65039;', en: 'Print/PDF', hi: 'प्रिंट/PDF', bn: 'প্রিন্ট/PDF', mr: 'प्रिंट/PDF', te: 'ప్రింట్/PDF' },
    { id: 'doc', ic: '&#128196;', en: 'Doc', hi: 'Doc', bn: 'Doc', mr: 'Doc', te: 'Doc' },
    { id: 'ppt', ic: '&#128202;', en: 'PPT', hi: 'PPT', bn: 'PPT', mr: 'PPT', te: 'PPT' },
    { id: 'image', ic: '&#127912;', en: 'Image', hi: 'चित्र', bn: 'ছবি', mr: 'चित्र', te: 'చిత్రం' },
    { id: 'links', ic: '&#128279;', en: 'Tool links', hi: 'टूल लिंक', bn: 'টুল লিংক', mr: 'टूल लिंक', te: 'టూల్ లింక్‌లు' },
    { id: 'interactive', ic: '&#128172;', en: 'Interactive', hi: 'इंटरैक्टिव', bn: 'ইন্টার‌্যাক্টিভ', mr: 'इंटरॅक्टिव्ह', te: 'ఇంటరాక్టివ్' },
    { id: 'text', ic: '&#9997;&#65039;', en: 'Text', hi: 'पाठ', bn: 'টেক্সট', mr: 'मजकूर', te: 'టెక్స్ట్' }
  ];
  function buildFormatFacets() {
    var mount = document.getElementById('formatMount'); if (!mount) return;
    mount.innerHTML = '';
    if (!ALL.some(function (p) { return p.fmt; })) { mount.hidden = true; return; }
    mount.hidden = false;
    var wrap = el('<div class="fchips format-chips" role="group" aria-label="' + esc(tr('outputFormat')) + '"></div>');
    FORMATS.forEach(function (item) {
      var n = item.id === 'all' ? null : ALL.filter(function (p) { return p.fmt === item.id; }).length;
      var b = el('<button class="fchip' + (state.fmt === item.id ? ' active' : '') + '" type="button" aria-pressed="' + (state.fmt === item.id) + '">' + item.ic + (item.ic ? ' ' : '') + esc(localLabel(item)) + (n != null ? ' <span class="fchip-ct">' + n + '</span>' : '') + '</button>');
      b.addEventListener('click', function () { state.fmt = item.id; state.renderLimit = 60; buildFormatFacets(); render(); });
      wrap.appendChild(b);
    });
    mount.appendChild(wrap);
  }

  /* ---------- header language switch: one tap, always on top ---------- */
  var LANGS = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'mr', label: 'मराठी' },
    { code: 'te', label: 'తెలుగు' }
  ];
  function initLangSwitch() {
    var head = document.querySelector('.site-head'); if (!head) return;
    var themeBtn = document.getElementById('themeBtn');
    var wrap = el('<div class="lang-switch" role="group" aria-label="' + esc(tr('languagePicker')) + '" data-i18n-aria="languagePicker" style="display:inline-flex;align-items:center;gap:4px;margin-right:8px">' +
      LANGS.filter(function (l) { return isLanguageLive(l.code); }).map(function (l) {
        return '<button type="button" class="lang-chip fchip' + (state.lang === l.code ? ' active' : '') + '" data-lang="' + l.code + '" aria-pressed="' + (state.lang === l.code) + '">' + l.label + '</button>';
      }).join('') + '</div>');
    wrap.querySelectorAll('.lang-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var code = b.getAttribute('data-lang');
        setLang(code);
      });
    });
    head.insertBefore(wrap, themeBtn);
  }

  /* ---------- 60-second start ---------- */
  // AUD-A P1/A1-P1/A2, AUD-C P1/C3, AUD-D P1/D1: three explicit taps,
  // remembered segment, and a full prompt modal with its fill fields open.
  var QUICK_SEGMENTS = [
    { id: 'jee-main', en: 'JEE Main', hi: 'JEE Main', bn: 'JEE Main', mr: 'JEE Main', te: 'JEE Main' },
    { id: 'jee-advanced', en: 'JEE Advanced', hi: 'JEE Advanced', bn: 'JEE Advanced', mr: 'JEE Advanced', te: 'JEE Advanced' },
    { id: 'olympiad', en: 'Olympiad', hi: 'ओलंपियाड', bn: 'Olympiad', mr: 'Olympiad', te: 'Olympiad' },
    { id: 'boards', en: 'Boards', hi: 'बोर्ड', bn: 'বোর্ড', mr: 'बोर्ड', te: 'బోర్డులు' },
    { id: 'foundation', en: 'Foundation', hi: 'फ़ाउंडेशन', bn: 'Foundation', mr: 'Foundation', te: 'Foundation' },
    { id: 'student', en: 'Student', hi: 'विद्यार्थी', bn: 'শিক্ষার্থী', mr: 'विद्यार्थी', te: 'విద్యార్థి' }
  ];
  var QUICK_ICONS = {
    paper: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h9l3 3V21H6zM9 10h6M9 14h6M9 18h4M15 3.5V7h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.2 12.2 2.4 2.4 5.3-5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    slides: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 20h8M12 17v3M7.5 13l2.7-3 2.3 2 2.8-3 1.2 1.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.8" width="10" height="18.4" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 6.5h4M10 10h4M10 13.5h2.5M11 18h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };
  var QUICK_JOBS = [
    { id: 'paper', icon: QUICK_ICONS.paper, label: 'paper', cats: ['question-papers', 'mock-sample-papers', 'competitive-exams', 'latex-pdf-sets'] },
    { id: 'solve-verify', icon: QUICK_ICONS.check, label: 'solveVerify', cats: ['verified-answers', 'single-solution', 'multi-method', 'photo-doubt-solving', 'error-analysis'] },
    { id: 'worksheet', icon: QUICK_ICONS.grid, label: 'worksheet', cats: ['worksheets', 'dpp', 'print-beautifully', 'endless-practice'] },
    { id: 'ppt', icon: QUICK_ICONS.slides, label: 'ppt', cats: ['presentations'] },
    { id: 'quiz', icon: QUICK_ICONS.phone, label: 'quiz', cats: ['phone-quizzes', 'quiz-mcq', 'games-gamification'] }
  ];
  function segmentPattern(id) {
    return {
      'jee-main': /jee main/i,
      'jee-advanced': /jee advanced|multi[- ]correct|partial[- ]mark/i,
      olympiad: /olympiad|ioqm|rmo|inmo/i,
      boards: /board|cbse|ncert/i,
      foundation: /foundation|class [6-8]|basics/i,
      student: /student|learner|self[- ]study/i
    }[id];
  }
  function quickCandidates(segment, job, fallbackAny) {
    return ALL.filter(function (p) {
      if (job.cats.indexOf(p._cat) === -1) return false;
      if (segment === 'student') return fallbackAny ? (p.exams || []).indexOf('any') !== -1 : (p.aud === 'student' || p.aud === 'both');
      return fallbackAny ? (p.exams || []).indexOf('any') !== -1 : (p.exams || []).indexOf(segment) !== -1;
    });
  }
  function chooseQuickPrompt(segment, jobId) {
    var job = QUICK_JOBS.find(function (item) { return item.id === jobId; }); if (!job) return null;
    var pool = quickCandidates(segment, job, false);
    if (!pool.length) pool = quickCandidates(segment, job, true);
    var rx = segmentPattern(segment);
    return pool.slice().sort(function (a, b) {
      function score(p) {
        var visible = [p.title, p.tag, p.whatYouGet].join(' ');
        var value = 100 - job.cats.indexOf(p._cat) * 8;
        if (rx && rx.test(visible)) value += 24;
        if (p.featured) value += 12;
        if ((p.exams || []).length === 1 && (p.exams || [])[0] === segment) value += 10;
        if (segment === 'student' && p.aud === 'student') value += 10;
        if (segment === 'student' && (p.exams || []).indexOf('any') !== -1) value += 18;
        if ((jobId === 'ppt' && p.fmt === 'ppt') || (jobId === 'quiz' && p.fmt === 'interactive') || (jobId === 'paper' && p.fmt === 'pdf-print')) value += 8;
        return value;
      }
      return score(b) - score(a) || String(a.slug).localeCompare(String(b.slug));
    })[0] || null;
  }
  function buildQuickStatus() {
    var status = document.getElementById('quickStatus'); if (!status) return;
    if (!state.quickSegment) { status.innerHTML = '<p>' + esc(tr('quickHint')) + '</p>'; return; }
    if (!state.quickJob) { status.innerHTML = '<p>' + esc(tr('chooseJob')) + '</p>'; return; }
    state.quickPrompt = chooseQuickPrompt(state.quickSegment, state.quickJob);
    if (!state.quickPrompt) { status.innerHTML = '<p>' + esc(tr('noMatch')) + '.</p>'; return; }
    status.innerHTML = '<div class="quick-result"><span class="quick-result-kicker">' + esc(tr('ready')) + '</span><strong>' + esc(T(state.quickPrompt, 'title')) + '</strong><span>' + esc(T(state.quickPrompt, 'whatYouGet')) + '</span><button class="btn btn-primary" type="button" id="quickOpen">' + esc(tr('openFill')) + ' &rarr;</button></div>';
    status.querySelector('#quickOpen').addEventListener('click', function () { openPromptCard(state.quickPrompt, { fillOpen: true }); });
  }
  function buildQuickStart() {
    var root = document.getElementById('quickStart');
    var segments = document.getElementById('quickSegment');
    var jobs = document.getElementById('quickJobs');
    if (!root || !segments || !jobs) return;
    root.setAttribute('data-audit', 'AUD-A-P1-A1 AUD-D-P1-D1');
    var head = root.querySelector('.quick-start-head');
    if (head) {
      var kicker = head.querySelector('.kicker'); var heading = head.querySelector('h2'); var sub = head.querySelector('p');
      if (kicker) kicker.textContent = tr('quickKicker'); if (heading) heading.textContent = tr('quickTitle'); if (sub) sub.textContent = tr('quickSub');
    }
    var stepLabels = root.querySelectorAll('.quick-step-label');
    if (stepLabels[0]) { var sb = stepLabels[0].querySelector('b'); var ss = stepLabels[0].querySelector('small'); if (sb) sb.textContent = tr('chooseSegment'); if (ss) ss.textContent = tr('segmentSmall'); }
    if (stepLabels[1]) { var jb = stepLabels[1].querySelector('b'); var js = stepLabels[1].querySelector('small'); if (jb) jb.textContent = tr('chooseJob'); if (js) js.textContent = tr('jobSmall'); }
    segments.innerHTML = '';
    QUICK_SEGMENTS.forEach(function (segment) {
      var selected = state.quickSegment === segment.id;
      var b = el('<button class="fchip quick-segment' + (selected ? ' active' : '') + '" type="button" aria-pressed="' + selected + '">' + esc(localLabel(segment)) + '</button>');
      b.addEventListener('click', function () {
        state.quickSegment = segment.id; state.quickJob = ''; state.quickPrompt = null;
        try { localStorage.setItem('mps-segment', segment.id); } catch (e) {}
        buildQuickStart();
      });
      segments.appendChild(b);
    });
    jobs.innerHTML = '';
    QUICK_JOBS.forEach(function (job) {
      var selected = state.quickJob === job.id;
      var b = el('<button class="quick-job' + (selected ? ' active' : '') + '" type="button" aria-pressed="' + selected + '"><span class="quick-job-icon" aria-hidden="true">' + job.icon + '</span><b>' + esc(tr(job.label)) + '</b></button>');
      b.disabled = !state.quickSegment;
      b.addEventListener('click', function () { state.quickJob = job.id; buildQuickStart(); });
      jobs.appendChild(b);
    });
    buildQuickStatus();
  }

  /* ---------- cards ---------- */
  function relBadge(p) {
    if (p.makesImage) return '<span class="rel"><span class="dot dot-amber"></span>' + esc(state.lang === 'en' ? (p.worksOnFree || tr('needsImageAI')) : tr('needsImageAI')) + '</span>';
    if (p.needsImage) return '<span class="rel"><span class="dot dot-blue"></span>' + esc(state.lang === 'en' ? (p.worksOnFree || tr('attachPhoto')) : tr('attachPhoto')) + '</span>';
    return '<span class="rel"><span class="dot dot-green"></span>' + esc(state.lang === 'en' ? (p.worksOnFree || tr('freeAI')) : tr('freeAI')) + '</span>';
  }
  function tagChip(p) {
    if (p.makesImage) return '<span class="tag tag-img">&#127912; ' + esc(state.lang === 'en' ? (p.tag || tr('makesImages')) : tr('makesImages')) + '</span>';
    if (p.needsImage) return '<span class="tag tag-img">&#128247; ' + esc(state.lang === 'en' ? (p.tag || tr('photoNeeded')) : tr('photoNeeded')) + '</span>';
    return '<span class="tag tag-txt">' + esc(state.lang === 'en' ? (p.tag || tr('textOnly')) : tr('textOnly')) + '</span>';
  }
  function formatBadge(p) {
    if (!p.fmt) return '';
    var item = FORMATS.find(function (format) { return format.id === p.fmt; });
    if (!item) return '';
    return '<span class="tag tag-format" data-output-format="' + esc(p.fmt) + '">' + item.ic + ' ' + esc(localLabel(item)) + '</span>';
  }
  function cardHTML(p) {
    var id = p._id;
    var saved = favorites.has(p.slug);
    // AUD-B P1/B3 + P2/B4 hooks; AUD-C P1/C1; AUD-E P1/E1.
    return '<article class="card' + (p.featured ? ' featured-card' : '') + '" data-id="' + id + '" data-slug="' + esc(p.slug) + '"><div class="card-tags"><span class="tag tag-cat"><span aria-hidden="true">' + esc(p._catIcon) + '</span> ' + esc(categoryLabel(p._cat)) + '</span>' + formatBadge(p) + tagChip(p) + '</div>' +
      '<h4>' + esc(T(p, 'title')) + '</h4><p class="card-what">' + esc(T(p, 'whatYouGet')) + '</p><div class="card-rel">' + relBadge(p) + '</div>' +
      '<button class="card-copy-main" data-copy="' + id + '">&#128203; ' + esc(tr('copyPrompt')) + '</button>' +
      '<div class="card-open">' +
      '<button class="btn-tool t-gpt" data-open="' + id + '" data-tool="gpt">&#129302; ' + esc(tr('openChatGPT')) + '</button>' +
      '<button class="btn-tool t-claude" data-open="' + id + '" data-tool="claude">&#128172; ' + esc(tr('openClaude')) + '</button>' +
      '</div>' +
      '<div class="card-secondary"><button class="card-more" data-view="' + id + '">' + esc(tr('howTo')) + ' &rarr;</button>' +
      '<button class="card-icon-action" data-favorite="' + id + '" aria-pressed="' + saved + '" aria-label="' + esc(saved ? tr('unsave') : tr('save')) + '">' + (saved ? '&#9829;' : '&#9825;') + '</button>' +
      '<button class="card-icon-action" data-share="' + id + '" aria-label="' + esc(tr('share')) + '">&#128241;</button></div>' +
      '</article>';
  }
  /* Tool names and common words teachers search for that the prompt texts may not
     contain verbatim - each maps to related words we also try, so a search for
     "wolfram" or "kahoot" surfaces the prompts that do that job. */
  var SYNONYMS = {
    wolfram: ['check', 'verify', 'graph', 'calculator', 'steps'],
    wolframalpha: ['check', 'verify', 'graph', 'calculator', 'steps'],
    desmos: ['graph', 'plot', 'function'],
    geogebra: ['graph', 'geometry', 'construction', 'diagram'],
    symbolab: ['solve', 'steps', 'check'],
    photomath: ['photo', 'solve', 'doubt'],
    mathway: ['solve', 'check', 'steps'],
    overleaf: ['latex', 'pdf'],
    stackexchange: ['doubt', 'proof', 'concept'],
    oeis: ['sequence', 'pattern'],
    khan: ['explain', 'concept', 'practice'],
    phet: ['interactive', 'activity', 'visual'],
    colab: ['python', 'code'],
    python: ['code', 'latex'],
    kahoot: ['quiz', 'game', 'mcq'],
    quizizz: ['quiz', 'mcq', 'test'],
    blooket: ['quiz', 'game'],
    forms: ['quiz', 'mcq', 'test', 'feedback'],
    excel: ['table', 'marks', 'tracker'],
    sheets: ['table', 'marks', 'tracker'],
    ppt: ['slide', 'presentation'],
    powerpoint: ['slide', 'presentation'],
    gamma: ['slide', 'presentation'],
    reels: ['reel', 'video', 'script'],
    youtube: ['video', 'script'],
    insta: ['instagram', 'social'],
    whatsapp: ['parent', 'message', 'communication']
  };
  function termHits(hayFull, hayCard, term, useSyn) {
    if (hayFull.indexOf(term) !== -1) return true;
    if (!useSyn) return false;
    // synonyms only match the short card fields, else generic words like "check" match everything;
    // word-start boundary so "graph" hits "graphs/graphing" but not "topographic"
    var alts = SYNONYMS[term]; if (!alts) return false;
    for (var ai = 0; ai < alts.length; ai++) { if (new RegExp('\\b' + alts[ai].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(hayCard)) return true; }
    return false;
  }
  function normalizeSearchText(value) { return String(value || '').normalize('NFKC').toLowerCase(); }
  function matches(p, useSyn) {
    if (state.group === 'saved' && !favorites.has(p.slug)) return false;
    if (state.group !== 'all' && state.group !== 'saved' && p._group !== state.group) return false;
    if (state.exam !== 'all' && (p.exams || []).indexOf(state.exam) === -1) return false;
    if (state.aud !== 'all' && p.aud !== state.aud && p.aud !== 'both') return false;
    if (state.fmt !== 'all' && p.fmt !== state.fmt) return false;
    if (state.query) {
      // AUD-A P1/A3 + AUD-D P3/D4 hook: catalog search keeps compact card
      // fields for every available language plus detected keywords from omitted bodies.
      var languageText = ['hi', 'bn', 'mr', 'te'].map(function (code) { return p[code] ? (' ' + (p[code].title || '') + ' ' + (p[code].whatYouGet || '') + ' ' + (p[code].promptText || '') + ' ' + (p[code].searchText || '')) : ''; }).join('');
      var categorySearch = Object.values(CATEGORY_LABELS[p._cat] || {}).join(' ');
      var groupSearch = Object.values(GROUP_LABELS[p._group] || {}).join(' ');
      var hayFull = normalizeSearchText(p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + ' ' + categorySearch + ' ' + p._group + ' ' + groupSearch + ' ' + (p.tag || '') + ' ' + (p._searchExtras || p.searchExtras || '') + ' ' + (p.howToUse || '') + ' ' + (p.promptText || '') + languageText);
      var cardTranslations = ['hi', 'bn', 'mr', 'te'].map(function (code) { return p[code] ? (' ' + (p[code].title || '') + ' ' + (p[code].whatYouGet || '')) : ''; }).join('');
      var hayCard = normalizeSearchText(p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + ' ' + categorySearch + cardTranslations);
      var terms = normalizeSearchText(state.query).split(/\s+/);
      for (var qi = 0; qi < terms.length; qi++) { if (terms[qi] && !termHits(hayFull, hayCard, terms[qi], useSyn)) return false; }
    }
    return true;
  }
  function updateCount(n, viaSynonyms) {
    var c = document.getElementById('resultCount'); if (!c) return;
    if (state.query && viaSynonyms) c.innerHTML = '<b>' + n + '</b> ' + esc(tr('related')) + ' &ldquo;' + esc(state.query) + '&rdquo;';
    else if (state.query) c.innerHTML = '<b>' + n + '</b> ' + esc(tr('found')) + ' &ldquo;' + esc(state.query) + '&rdquo;';
    else if (state.group === 'saved') c.innerHTML = '<b>' + n + '</b> ' + esc(tr('saved'));
    else if (state.group !== 'all') c.innerHTML = '<b>' + n + '</b> ' + esc(groupLabel(state.group));
    else c.innerHTML = esc(tr('browseAll')) + ' <b>' + n + '</b> ' + esc(tr('promptsNoun'));
  }
  function suggestTerms() { return tr('suggestTerms').split('|').filter(Boolean); }
  function persistFavorites() { try { localStorage.setItem('mps-favorites', JSON.stringify(Array.from(favorites))); } catch (e) {} }
  function toggleFavorite(p) {
    if (!p || !p.slug) return;
    if (favorites.has(p.slug)) favorites.delete(p.slug); else favorites.add(p.slug);
    persistFavorites(); buildChips(); render();
  }
  function rememberRecent(p) {
    if (!p || !p.slug) return;
    recentSlugs = [p.slug].concat(recentSlugs.filter(function (slug) { return slug !== p.slug; })).slice(0, 8);
    try { localStorage.setItem('mps-recent', JSON.stringify(recentSlugs)); } catch (e) {}
  }
  function promptOfDay() {
    if (!ALL.length) return null;
    var day = new Date().toISOString().slice(0, 10);
    var hash = 2166136261;
    for (var i = 0; i < day.length; i++) { hash ^= day.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    var sorted = ALL.slice().sort(function (a, b) { return String(a.slug).localeCompare(String(b.slug)); });
    return sorted[(hash >>> 0) % sorted.length];
  }

  /* AUD-C P1/C1-P1/C2: local saved/recent/daily discovery, only unfiltered. */
  function discoveryHTML() {
    var frag = document.createDocumentFragment();
    var featured = ALL.filter(function (p) { return p.featured; });
    var fresh = ALL.filter(function (p) { return p.added; });
    var saved = ALL.filter(function (p) { return favorites.has(p.slug); });
    var recent = recentSlugs.map(findSlug).filter(Boolean);
    var used = new Set();
    var cardCount = 0;
    function row(title, items, max) {
      var unique = items.filter(function (p) { if (!p || used.has(p.slug)) return false; used.add(p.slug); return true; }).slice(0, max);
      if (!unique.length) return;
      var block = el('<section class="cat-block"></section>');
      block.appendChild(el('<div class="cat-block-head"><h3>' + title + '</h3><span class="cat-count">' + unique.length + '</span></div>'));
      var grid = el('<div class="cards"></div>');
      unique.forEach(function (p) { grid.appendChild(el(cardHTML(p))); cardCount++; });
      block.appendChild(grid); frag.appendChild(block);
    }
    row('&#9728;&#65039; ' + esc(tr('promptDay')), [promptOfDay()], 1);
    row('&#9829; ' + esc(tr('savedShelf')), saved, 4);
    row('&#128337; ' + esc(tr('recent')), recent, 4);
    row('&#128293; ' + esc(tr('important')), featured, 6);
    row('&#10024; ' + esc(tr('added')), fresh, 6);
    return { fragment: frag, count: cardCount, slugs: used };
  }
  function openPromptCard(card, options) { return withFullPrompt(card, function (full) { openModal(full, options || {}); }); }
  function openRandom() { if (ALL.length) openPromptCard(ALL[Math.floor(Math.random() * ALL.length)]); }
  function render() {
    var stream = document.getElementById('catStream'); if (!stream) return; stream.innerHTML = '';
    var useSyn = false;
    // exact pass first; if a search finds nothing, retry once letting tool-name synonyms match
    if (state.query && !ALL.some(function (p) { return matches(p, false); }) && ALL.some(function (p) { return matches(p, true); })) useSyn = true;
    var matched = ALL.filter(function (p) { return matches(p, useSyn); });
    var count = matched.length;
    var defaultView = !state.query && state.group === 'all' && state.exam === 'all' && state.aud === 'all' && state.fmt === 'all';
    var discovery = defaultView ? discoveryHTML() : { fragment: document.createDocumentFragment(), count: 0, slugs: new Set() };
    var budget = Math.max(0, state.renderLimit - discovery.count);
    var uniqueMatched = matched.filter(function (p) { return !discovery.slugs.has(p.slug); });
    var visible = uniqueMatched.slice(0, budget);
    GROUPS.forEach(function (g) {
      var catsIn = DATA.filter(function (c) { return c.group === g; });
      var has = false; var frag = document.createDocumentFragment();
      catsIn.forEach(function (cat) {
        var prompts = visible.filter(function (p) { return p._cat === cat.category; }); if (!prompts.length) return; has = true;
        var fullCategoryCount = matched.filter(function (p) { return p._cat === cat.category; }).length;
        var block = el('<section class="cat-block" id="cat-' + cat.category + '"></section>');
        block.appendChild(el('<div class="cat-block-head"><span class="cat-ic">' + (cat.categoryIcon || '') + '</span><h3>' + esc(categoryLabel(cat)) + '</h3><span class="cat-count">' + fullCategoryCount + ' ' + esc(tr('promptsNoun')) + '</span></div>'));
        if (cat.categoryBlurb) block.appendChild(el('<p class="cat-blurb">' + esc(cat.categoryBlurb) + '</p>'));
        var grid = el('<div class="cards"></div>'); prompts.forEach(function (p) { grid.appendChild(el(cardHTML(p))); }); block.appendChild(grid); frag.appendChild(block);
      });
      if (has) { stream.appendChild(el('<div class="group-head"><h3>' + esc(groupLabel(g)) + '</h3></div>')); stream.appendChild(frag); }
    });
    if (useSyn && count) stream.insertBefore(el('<div class="no-results" style="margin-bottom:18px">' + esc(trf('synonymNotice', { query: state.query })) + '</div>'), stream.firstChild);
    if (defaultView && count) {
      var randWrap = el('<div class="random-prompt-wrap"><button class="fchip" id="randBtn" type="button">&#127922; ' + esc(tr('surprise')) + '</button></div>');
      randWrap.querySelector('#randBtn').addEventListener('click', openRandom);
      stream.insertBefore(discovery.fragment, stream.firstChild);
      stream.insertBefore(randWrap, stream.firstChild);
    }
    if (!count) {
      var nr = el('<div class="no-results">' + esc(tr('noMatch')) + ' &ldquo;' + esc(state.query) + '&rdquo;.<div class="fchips"></div></div>');
      var chipWrap = nr.querySelector('.fchips');
      suggestTerms().forEach(function (t) {
        var b = el('<button class="fchip" type="button">' + esc(t) + '</button>');
        b.addEventListener('click', function () { var s = document.getElementById('search'); if (s) s.value = t; state.query = t; state.renderLimit = 60; var cl = document.getElementById('searchClear'); if (cl) cl.hidden = false; render(); });
        chipWrap.appendChild(b);
      });
      stream.appendChild(nr);
    }
    var remaining = uniqueMatched.length - visible.length;
    if (remaining > 0) {
      var more = el('<div class="show-more-wrap"><button class="btn btn-soft" type="button" id="showMore" aria-controls="catStream">' + esc(tr('showMore')) + ' <span>(' + remaining + ')</span></button></div>');
      more.querySelector('#showMore').addEventListener('click', function () { state.renderLimit += 60; render(); });
      stream.appendChild(more);
    }
    if (!state.hasRendered) {
      stream.querySelectorAll('.cards').forEach(function (grid) { grid.classList.add('is-initial-load'); });
      state.hasRendered = true;
    }
    updateCount(count, useSyn);
  }

  function findPrompt(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i]._id === id) return ALL[i]; return null; }

  // AUD-E P1/E1-P1/E3: share the outcome and canonical URL, never the full prompt.
  function sharePrompt(p) {
    if (!p) return;
    var page = SITE + 'p/' + (p.slug || '') + '/';
    var message = tr('shareLead') + ': ' + T(p, 'title') + '\n' + T(p, 'whatYouGet');
    function whatsapp() { window.open('https://wa.me/?text=' + encodeURIComponent(message + '\n' + page), '_blank', 'noopener'); }
    if (navigator.share) {
      navigator.share({ title: T(p, 'title') + ' — Maths Prompt Studio', text: message, url: page }).catch(function (error) { if (!error || error.name !== 'AbortError') whatsapp(); });
    } else whatsapp();
  }

  /* ---------- delegated clicks on the stream (fast for 500+ cards) ---------- */
  function wireStream() {
    var stream = document.getElementById('catStream'); if (!stream) return;
    stream.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-copy')) { var p = findPrompt(b.getAttribute('data-copy')); if (p) withFullPrompt(p, function (full) { copyText(T(full, 'promptText'), b, tr('copied')); }); }
      else if (b.hasAttribute('data-view')) { openPromptCard(findPrompt(b.getAttribute('data-view'))); }
      else if (b.hasAttribute('data-open')) { var p2 = findPrompt(b.getAttribute('data-open')); if (p2) withFullPrompt(p2, function (full) { openTool(T(full, 'promptText'), b.getAttribute('data-tool'), b); }); }
      else if (b.hasAttribute('data-fmt')) { var p3 = findPrompt(b.getAttribute('data-fmt')); if (p3) withFullPrompt(p3, function (full) { copyFormatted(T(full, 'promptText'), b.getAttribute('data-kind'), b); }); }
      else if (b.hasAttribute('data-favorite')) { toggleFavorite(findPrompt(b.getAttribute('data-favorite'))); }
      else if (b.hasAttribute('data-share')) { sharePrompt(findPrompt(b.getAttribute('data-share'))); }
    });
  }

  /* ---------- modal ---------- */
  function openModal(p, options) {
    if (!p) return;
    options = options || {};
    var effList = T(p, 'effectiveUsage');
    var steps = (effList && effList.length) ? '<div class="modal-eff"><h4>&#9989; ' + esc(tr('effectiveTitle')) + '</h4><ol>' + effList.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' : '';
    var fixText = T(p, 'commonFix');
    var fix = fixText ? '<div class="modal-fix"><b>&#128295; ' + esc(tr('fixLabel')) + '</b> ' + esc(fixText) + '</div>' : '';
    var body = document.getElementById('modalBody');
    var activeText = T(p, 'promptText');
    var _toks = [];
    (activeText.match(/\[[^\]\n]+\]/g) || []).forEach(function (t) { if (_toks.indexOf(t) === -1) _toks.push(t); });
    _toks = _toks.slice(0, 12);
    function filled() { var t = activeText; _toks.forEach(function (tok, i) { var elx = body.querySelector('[data-tok="' + i + '"]'); var v = elx ? elx.value.trim() : ''; if (v) t = t.split(tok).join(v); }); return t; }
    var fillHTML = '';
    if (_toks.length) {
      var hasStyles = p.styles && p.styles.length;
      fillHTML = '<details class="modal-fill"' + (hasStyles || options.fillOpen ? ' open' : '') + '><summary>&#9999;&#65039; ' + (hasStyles ? esc(tr('pickStyle')) : '') + esc(tr('fillOptional')) + '</summary><p class="mf-note">' + esc(tr('fillNote')) + '</p><div class="mf-grid">' +
        _toks.map(function (t, i) {
          var label = esc(t.replace(/^\[|\]$/g, '').slice(0, 52));
          if (hasStyles && /STYLE/i.test(t)) {
            return '<label class="mf-f"><span>' + label + '</span><select data-tok="' + i + '"><option value="">' + esc(trf('chooseStyles', { count: p.styles.length })) + '</option>' +
              p.styles.map(function (s) { return '<option value="' + esc(s.name + ': ' + s.direction) + '">' + esc(s.name) + '</option>'; }).join('') + '</select></label>';
          }
          var long = /PASTE|ATTACH|QUESTION|DATA|LIST|DESCRIBE|CHAPTER|TOPIC|SYLLABUS|WRITE YOURS|FIGURE/i.test(t);
          return '<label class="mf-f"><span>' + label + '</span>' + (long ? '<textarea data-tok="' + i + '" rows="2"></textarea>' : '<input data-tok="' + i + '" type="text" />') + '</label>';
        }).join('') +
        '</div></details>';
    }
    body.innerHTML = '<h3 id="modalTitle">' + esc(T(p, 'title')) + '</h3><div class="modal-tags"><span class="tag tag-cat"><span aria-hidden="true">' + esc(p._catIcon || '') + '</span> ' + esc(categoryLabel(p._cat)) + '</span>' + formatBadge(p) + tagChip(p) + '</div>' +
      '<div class="card-rel" style="margin:0 0 14px">' + relBadge(p) + ' &nbsp;&middot;&nbsp; <span class="rel">' + esc(tr('bestTool')) + ': <b>&nbsp;' + esc(p.bestTool || tr('anyAIChat')) + '</b></span></div>' +
      '<div class="modal-open"><span class="mo-lbl">' + esc(tr('openOne')) + '</span><div class="mo-btns"><button class="btn-tool t-gpt" id="mGpt">&#129302; ' + esc(tr('openChatGPT')) + '</button><button class="btn-tool t-claude" id="mClaude">&#128172; ' + esc(tr('openClaude')) + '</button></div></div>' +
      steps + fix + fillHTML +
      '<div class="modal-export"><span class="mo-lbl">' + esc(tr('getAs')) + '</span><div class="mo-btns"><button class="btn-soft" id="mPdf">PDF</button><button class="btn-soft" id="mWord">Word</button><button class="btn-soft" id="mPpt">PPT</button></div></div>' +
      '<div class="modal-lbl">' + esc(tr('promptLabel')) + '</div><div class="prompt-box"><pre id="mPre">' + esc(activeText) + '</pre></div>' +
      '<div class="modal-actions"><button class="btn-copy" id="mCopy">&#128203; ' + esc(tr('copyPrompt')) + '</button>' +
      '<button class="btn-soft" id="mShare">&#128241; ' + esc(tr('share')) + '</button>' +
      '<button class="btn-soft" id="mLink">&#128279; ' + esc(tr('copyLink')) + '</button>' +
      '<button class="btn-view" data-close>' + esc(tr('close')) + '</button></div>' +
      '<p class="modal-report"><a href="#" id="mReport">&#9888;&#65039; ' + esc(tr('reportProblem')) + '</a></p>';
    var PAGE = SITE + 'p/' + (p.slug || '') + '/';
    document.getElementById('mGpt').addEventListener('click', function () { openTool(filled(), 'gpt', this); });
    document.getElementById('mClaude').addEventListener('click', function () { openTool(filled(), 'claude', this); });
    document.getElementById('mCopy').addEventListener('click', function () { copyText(filled(), this, tr('copied')); });
    document.getElementById('mPdf').addEventListener('click', function () { copyFormatted(filled(), 'pdf', this); });
    document.getElementById('mWord').addEventListener('click', function () { copyFormatted(filled(), 'word', this); });
    document.getElementById('mPpt').addEventListener('click', function () { copyFormatted(filled(), 'ppt', this); });
    body.querySelectorAll('[data-tok]').forEach(function (elx) { elx.addEventListener('input', function () { var pre = document.getElementById('mPre'); if (pre) pre.textContent = filled(); }); });
    document.getElementById('mShare').addEventListener('click', function () { sharePrompt(p); });
    document.getElementById('mLink').addEventListener('click', function () { copyText(PAGE, this, tr('linkCopied')); });
    document.getElementById('mReport').addEventListener('click', function (e) {
      e.preventDefault();
      var b = 'Prompt: ' + p.title + ' (' + (p.slug || p._id) + ')\nPage: ' + PAGE + '\n\nWhat went wrong (e.g. wrong answer, unclear step, bad formatting):\n';
      window.location.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Problem with prompt: ' + p.title) + '&body=' + encodeURIComponent(b);
    });
    body.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    if (p.slug) { try { history.replaceState(null, '', '#p/' + p.slug); } catch (e) {} }
    var m = document.getElementById('modal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    rememberRecent(p);
  }
  function closeModal() { var m = document.getElementById('modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; if ((location.hash || '').indexOf('#p/') === 0) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} } }
  function findSlug(slug) { for (var i = 0; i < ALL.length; i++) if (ALL[i].slug === slug) return ALL[i]; return null; }
  function openFromHash() { var h = location.hash || ''; if (h.indexOf('#p/') === 0) { var p = findSlug(decodeURIComponent(h.slice(3))); if (p) openPromptCard(p); } }

  /* ---------- LEARN 10x ---------- */
  var LEARN = [
    { ic: '&#128260;', t: 'The Feynman Loop', w: 'Understand anything deeply by explaining it simply.', p: 'Act as my study coach. Explain [TOPIC] to me in the simplest words, as if I am 12 years old. Then tell me the 3 parts students most often misunderstand, and quiz me on them one question at a time, waiting for my answer each time.' },
    { ic: '&#129504;', t: 'Active Recall Drill', w: 'Remembering by testing beats re-reading every time.', p: 'Be my quiz master for [TOPIC] at [CLASS/LEVEL]. Ask me ONE question at a time, wait for my answer, tell me if I am right, and give a one-line explanation. Start easy and get harder. Keep going until I say stop, then summarise my weak spots.' },
    { ic: '&#10067;', t: 'The Socratic Tutor', w: 'Reach the answer yourself with guided questions.', p: 'Be my maths tutor for [TOPIC]. Do NOT give me the answer. Ask me guiding questions one at a time until I work it out myself. If I am stuck, give a small hint, not the solution. Encourage me as we go.' },
    { ic: '&#9997;&#65039;', t: 'Worked Example, then Fade', w: 'Learn a skill, then practise with less and less help.', p: 'Teach me [SKILL] in 3 steps: (1) show ONE fully worked example with reasons for each line; (2) give me a similar problem with hints; (3) give me one with no hints. Check my answer after each and correct gently.' },
    { ic: '&#128269;', t: 'Spot-My-Mistake', w: 'Finding errors builds sharper understanding.', p: 'Give me a worked solution to a [TOPIC] problem that contains exactly ONE subtle but realistic mistake. I will try to find it. After I answer, tell me if I was right and explain the error and how to avoid it.' },
    { ic: '&#127757;', t: 'Analogy Engine', w: 'Make an abstract idea click with real-life pictures.', p: 'Explain [CONCEPT] using 3 different real-life analogies a student would relate to, then give a one-line plain-English definition, then one practice question to check I got it.' },
    { ic: '&#9201;&#65039;', t: 'Exam Simulator', w: 'Train under real exam conditions, then get marked.', p: 'Act as a strict [EXAM e.g. board / JEE] examiner. Give me [N] questions on [TOPIC] one at a time with a suggested time each. After I answer all of them, mark me out of the total, show where I lost marks, and list what to revise.' },
    { ic: '&#8617;&#65039;', t: 'Teach-Back', w: 'If you can teach it, you truly know it.', p: 'I am going to explain [TOPIC] to you in my own words. Listen carefully, then correct any mistakes, fill the gaps, rate my understanding out of 10, and tell me the ONE thing to fix first. Ready - here is my explanation: [WRITE YOURS].' },
    { ic: '&#128197;', t: 'Spaced Revision Plan', w: 'Beat forgetting with a smart, short daily plan.', p: 'Make me a 7-day revision plan for [CHAPTER] for [CLASS/EXAM]. Each day under 30 minutes, mixing new review with a quick active-recall check on earlier days. End with a short mock on day 7.' },
    { ic: '&#128506;&#65039;', t: 'Connect-the-Dots Map', w: 'See how each topic links to the bigger picture.', p: 'Show how [TOPIC] connects to other maths I have learned. Give a simple text map: what I need to know BEFORE this, the key ideas IN this topic, and what this UNLOCKS next. Add one line on why it matters.' },
  ];
  function renderLearn() {
    var grid = document.getElementById('learnGrid'); if (!grid) return;
    grid.innerHTML = '';
    LEARN.forEach(function (x) {
      var c = el('<article class="learn-card"><div class="learn-top"><span class="learn-ic">' + x.ic + '</span><h3>' + esc(x.t) + '</h3></div><p class="learn-what">' + esc(x.w) + '</p><div class="learn-prompt">' + esc(x.p) + '</div><button class="btn-copy learn-copy">&#128203; ' + esc(tr('copyTechnique')) + '</button></article>');
      c.querySelector('.learn-copy').addEventListener('click', function () { copyText(x.p, this, tr('techniqueCopied')); });
      grid.appendChild(c);
    });
  }

  /* ---------- feedback / share / about / tabs / theme / reveal ---------- */
  function initFeedback() {
    var rating = 0; var stars = document.querySelectorAll('#fbStars .star');
    function paint(v) { stars.forEach(function (s) { s.classList.toggle('on', parseInt(s.getAttribute('data-v'), 10) <= v); }); }
    stars.forEach(function (s) { var v = parseInt(s.getAttribute('data-v'), 10); s.addEventListener('mouseenter', function () { paint(v); }); s.addEventListener('click', function () { rating = v; paint(v); }); });
    var sw = document.getElementById('fbStars'); if (sw) sw.addEventListener('mouseleave', function () { paint(rating); });
    function compose() {
      var role = (document.getElementById('fbRole') || {}).value || ''; var msg = (document.getElementById('fbMsg') || {}).value || ''; var name = (document.getElementById('fbName') || {}).value || '';
      return { subject: tr('feedbackSubject') + (rating ? ' (' + rating + '/5)' : ''), body: tr('feedbackRatingField') + ': ' + (rating ? rating + '/5' : '-') + '\n' + tr('feedbackRoleField') + ': ' + role + '\n' + tr('feedbackNameField') + ': ' + (name || '-') + '\n\n' + tr('feedbackBodyField') + ':\n' + (msg || '(' + tr('none') + ')') + '\n\n--\n' + tr('feedbackSentFrom') };
    }
    var form = document.getElementById('fbForm');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); var c = compose(); window.location.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent(c.subject) + '&body=' + encodeURIComponent(c.body); var h = document.getElementById('fbHint'); if (h) h.textContent = tr('emailOpened'); });
    var cb = document.getElementById('fbCopy'); if (cb) cb.addEventListener('click', function () { var c = compose(); copyText(c.body, this, tr('feedbackCopied')); });
    var em = document.getElementById('fbEmailLink'); if (em) em.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent(tr('feedbackSubject'));
    var fl = document.getElementById('fbFormLink'); if (fl && CFG.googleFormUrl) { fl.href = CFG.googleFormUrl; fl.hidden = false; }
    var wa = document.getElementById('fbWaLink'); if (wa && CFG.whatsapp) { wa.href = 'https://wa.me/' + String(CFG.whatsapp).replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(tr('whatsappLead') + ' '); wa.hidden = false; }
    var ig = document.getElementById('fbInstaLink'); if (ig && CFG.instagram) { ig.href = 'https://instagram.com/' + String(CFG.instagram).replace(/^@/, ''); ig.hidden = false; }
  }
  function initShare() {
    function message() { return trf('shareMessage', { count: ALL.length }); }
    var wa = document.getElementById('shareWa'); if (wa) wa.addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent(message() + ' ' + SITE), '_blank'); });
    var cp = document.getElementById('shareCopy'); if (cp) cp.addEventListener('click', function () { copyText(SITE, this, tr('shareLinkCopied')); });
    var more = document.getElementById('shareMore'); if (more && navigator.share) { more.hidden = false; more.addEventListener('click', function () { navigator.share({ title: 'Maths Prompt Studio', text: message(), url: SITE }).catch(function () {}); }); }
    var link = document.getElementById('shareLink'); if (link) link.textContent = SITE;
  }
  function initAbout() { var a = document.getElementById('aboutAvatar'); if (a && CFG.photoUrl) { a.style.backgroundImage = 'url(' + CFG.photoUrl + ')'; a.style.backgroundSize = 'cover'; a.style.backgroundPosition = 'center'; a.textContent = ''; } }
  function buildPaperPrompt(o) {
    var foot = '\n\nSIGNATURE: If I filled in a name, end the paper with a "Prepared by [YOUR NAME]" footer line; otherwise add no signature.';
    var sectioned = /paper|test/i.test(o.type);
    return 'ROLE: Act as a senior ' + o.board + ' mathematics paper-setter and answer-key writer with 25 years of experience.\n\n' +
      'CONTEXT: Make a ' + o.type + ' for ' + o.cls + ' students (' + o.board + '). Total marks: ' + o.marks + '. Time: ' + o.time + '. Difficulty: ' + o.diff + '.\n\n' +
      'CHAPTERS / TOPICS to draw from (use ONLY these, and only the CURRENT syllabus): ' + o.chapters + '\n\n' +
      'YOUR TASK:\n' +
      '1. Start with a clean header block: exam name, subject (Mathematics), class, board, time, max marks, and 5-7 numbered General Instructions.\n' +
      (sectioned
        ? '2. Organise into standard ' + o.board + ' sections (e.g. Section A objective/MCQ, B very-short, C short, D long, E case/source-based) suited to the marks. Number questions continuously; show marks in brackets on the right; add internal choice (OR) where the pattern expects it.\n'
        : '2. Present it as a clean ' + o.type + ': a graded set of questions from easy to hard, numbered, with marks/level shown.\n') +
      '3. Add a mark-distribution table; the grand total MUST equal ' + o.marks + '.\n' +
      '4. Then, clearly separated under a heading "ANSWER KEY", give a complete step-wise solution and marking scheme for every question.\n\n' +
      'HOW TO WORK IT OUT: Silently solve every question first to confirm it is solvable and unambiguous. Check the marks sum exactly to ' + o.marks + '. Keep all maths in readable plain text (a/b, x^2, sqrt(x)) - never raw LaTeX.\n\n' +
      'OUTPUT FILE FORMAT: present everything ready to paste into Microsoft Word or Google Docs and print as an A4 PDF; keep the ANSWER KEY clearly separated.\n\n' +
      'GROUND RULES: stay strictly inside the given chapters and the current ' + o.board + ' syllabus; do not invent out-of-syllabus topics, fake data, or marks you were not asked for. If a chapter name is unclear, ask me before including it.' +
      foot;
  }
  function initBuilder() {
    var btn = document.getElementById('bBuild'); if (!btn) return;
    function gen() {
      return buildPaperPrompt({
        cls: (document.getElementById('bClass') || {}).value || 'Class 10',
        board: (document.getElementById('bBoard') || {}).value || 'CBSE',
        type: (document.getElementById('bType') || {}).value || 'Full question paper',
        diff: (document.getElementById('bDiff') || {}).value || 'Balanced',
        chapters: ((document.getElementById('bChapters') || {}).value || '').trim() || '[type your chapters here]',
        marks: ((document.getElementById('bMarks') || {}).value || '40').trim(),
        time: ((document.getElementById('bTime') || {}).value || '1.5 hours').trim()
      });
    }
    function refresh() { var pre = document.getElementById('bPre'); if (pre) pre.textContent = gen(); }
    btn.addEventListener('click', function () { var o = document.getElementById('bOut'); o.hidden = false; refresh(); o.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    var c = document.getElementById('bCopy'); if (c) c.addEventListener('click', function () { copyText(gen(), this, tr('techniqueCopied')); });
    var g = document.getElementById('bGpt'); if (g) g.addEventListener('click', function () { openTool(gen(), 'gpt', this); });
    var cl = document.getElementById('bCla'); if (cl) cl.addEventListener('click', function () { openTool(gen(), 'claude', this); });
  }
  function initAnalytics() { if (!CFG.analyticsSrc) return; var s = document.createElement('script'); s.defer = true; s.src = CFG.analyticsSrc; if (CFG.analyticsDomain) s.setAttribute('data-domain', CFG.analyticsDomain); document.head.appendChild(s); }
  function initTrust() { var btn = document.getElementById('verifyBtn'); if (!btn) return; btn.addEventListener('click', function () { var p = findSlug('double-check-any-ai-maths-answer') || ALL.find(function (x) { return /double-check/i.test(x.title); }); if (p) openPromptCard(p); else { document.getElementById('library').scrollIntoView({ behavior: 'smooth' }); } }); }
  function initTabs() { document.querySelectorAll('.tabs').forEach(function (set) { set.querySelectorAll('.tab').forEach(function (tab) { tab.addEventListener('click', function () { var name = tab.getAttribute('data-tab'); set.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); }); tab.classList.add('active'); set.parentElement.querySelectorAll('.tabpane').forEach(function (pane) { pane.classList.toggle('active', pane.getAttribute('data-pane') === name); }); }); }); }); }
  function initReveal() { var els = Array.prototype.filter.call(document.querySelectorAll('.reveal'), function (e) { return !e.closest('.hero'); }); if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; } var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: 0.12 }); els.forEach(function (e) { io.observe(e); }); }
  function initTheme() { var saved = null; try { saved = localStorage.getItem('mps-theme'); } catch (e) {} if (saved) document.documentElement.setAttribute('data-theme', saved); var btn = document.getElementById('themeBtn'); function sync() { btn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? '&#9728;' : '&#9790;'; } sync(); btn.addEventListener('click', function () { var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('mps-theme', next); } catch (e) {} sync(); }); }

  /* ---------- search ---------- */
  function ensureSearchCatalogs(query) {
    if (!normalizeSearchText(query).trim()) return Promise.resolve();
    var languages = LANGS.filter(function (item) { return item.code !== 'en' && isLanguageLive(item.code); }).map(function (item) { return item.code; });
    return Promise.all(languages.map(function (lang) { return ensureCatalogLanguage(lang); }));
  }
  function initSearch() {
    var s = document.getElementById('search'); var clearBtn = document.getElementById('searchClear'); if (!s) return; var deb;
    function apply() {
      state.query = normalizeSearchText(s.value.trim());
      state.renderLimit = 60;
      if (clearBtn) clearBtn.hidden = !state.query;
      if (!state.query) render();
      else {
        var requestedQuery = state.query;
        ensureSearchCatalogs(requestedQuery).then(function () { if (state.query === requestedQuery) render(); }).catch(function () {});
      }
      // mobile-friendly: when a search begins, bring the results into view so the change is visible
      if (state.query && state.prevEmpty) { var lib = document.getElementById('library'); if (lib) lib.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      state.prevEmpty = !state.query;
    }
    s.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(apply, 140); });
    if (clearBtn) clearBtn.addEventListener('click', function () { s.value = ''; state.query = ''; state.renderLimit = 60; clearBtn.hidden = true; state.prevEmpty = true; render(); s.focus(); });
  }

  function init() {
    document.getElementById('year').textContent = new Date().getFullYear();
    assertUiDictionary(); applyStaticChrome(); initTheme(); initLangSwitch(); initTabs(); renderLearn(); initFeedback(); initShare(); initAbout(); initReveal(); initAnalytics();
    if (!DATA.length) { document.getElementById('catStream').innerHTML = '<div class="no-results">' + esc(tr('libraryPreparing')) + '</div>'; return; }
    var search = document.getElementById('search'); if (search) search.placeholder = tr('searchPlaceholder');
    setStats(); buildChips(); buildFacets(); buildFormatFacets(); buildQuickStart(); wireStream(); render(); initSearch(); initTrust(); initBuilder();
    if (restoredLanguage !== 'en') ensureCatalogLanguage(restoredLanguage).then(function () { commitLanguage(restoredLanguage); }).catch(function () { commitLanguage('en'); });
    document.querySelectorAll('#modal [data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    openFromHash(); window.addEventListener('hashchange', openFromHash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
