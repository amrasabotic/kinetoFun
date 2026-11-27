type Section = { title: string; body: string; list?: string[] };

const en = {
  updated: "Last updated: June 2026",
  privacy: {
    title: "Privacy Policy",
    sections: [
      { title: "Introduction", body: "KinetoFun is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information." },
      { title: "Information We Collect", body: "We collect information you provide directly to us, such as when you create an account, including your email address, username, and profile information." },
      { title: "How We Use Your Information", body: "We use your information to provide, maintain, and improve our services, as well as to communicate with you about updates and changes to our platform." },
    ] as Section[],
    contactTitle: "Contact Us",
    contactBody: "If you have questions about this Privacy Policy, please contact us at",
  },
  terms: {
    title: "Terms of Service",
    sections: [
      { title: "Agreement to Terms", body: "By accessing and using KinetoFun, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service." },
      { title: "User Responsibilities", body: "You agree to use KinetoFun only for lawful purposes and in a way that does not infringe upon the rights of others or restrict their use and enjoyment of the service." },
      { title: "Limitation of Liability", body: "KinetoFun is provided on an \"as is\" basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, and non-infringement of intellectual property or other violation of rights." },
    ] as Section[],
    contactTitle: "Contact Us",
    contactBody: "If you have questions about these Terms of Service, please contact us at",
  },
  cookies: {
    title: "Cookie Policy",
    sections: [
      { title: "What Are Cookies?", body: "Cookies are small pieces of data stored on your device that help us remember your preferences and login information." },
      {
        title: "How We Use Cookies",
        body: "We use cookies to:",
        list: [
          "Keep you logged in to your account",
          "Remember your display and language preferences",
          "Analyze how you use KinetoFun to improve our service",
        ],
      },
      { title: "Session Cookies", body: "KinetoFun uses secure, httpOnly session cookies to maintain your login session. These cookies are deleted when you log out or close your browser." },
      { title: "Managing Cookies", body: "You can control cookie settings in your browser. However, disabling cookies may affect your ability to use KinetoFun." },
    ] as Section[],
  },
  contact: {
    title: "Contact Us",
    subtitle: "We'd love to hear from you. Get in touch with the KinetoFun team.",
    email: "Email",
    general: "For general inquiries:",
    support: "For support:",
    social: "Social",
    socialBody: "Follow us on social media for updates and announcements.",
    response: "Response Time",
    responseBody: "We typically respond to inquiries within 24-48 hours during business days.",
  },
};

const sq: typeof en = {
  updated: "Përditësuar së fundi: qershor 2026",
  privacy: {
    title: "Politika e privatësisë",
    sections: [
      { title: "Hyrje", body: "KinetoFun angazhohet të mbrojë privatësinë tënde. Kjo Politikë e Privatësisë shpjegon si i mbledhim, i përdorim, i ndajmë dhe i mbrojmë të dhënat e tua." },
      { title: "Të dhënat që mbledhim", body: "Mbledhim të dhënat që na jep drejtpërdrejt, për shembull kur krijon një llogari, duke përfshirë adresën e email-it, emrin e përdoruesit dhe të dhënat e profilit." },
      { title: "Si i përdorim të dhënat e tua", body: "I përdorim të dhënat e tua për të ofruar, mirëmbajtur dhe përmirësuar shërbimet tona, si dhe për të të njoftuar për përditësimet dhe ndryshimet në platformë." },
    ],
    contactTitle: "Na kontakto",
    contactBody: "Nëse ke pyetje për këtë Politikë të Privatësisë, na shkruaj te",
  },
  terms: {
    title: "Kushtet e shërbimit",
    sections: [
      { title: "Pranimi i kushteve", body: "Duke hyrë dhe duke përdorur KinetoFun, pranon dhe bie dakord të zbatosh kushtet dhe dispozitat e kësaj marrëveshjeje. Nëse nuk bie dakord me to, të lutemi mos e përdor këtë shërbim." },
      { title: "Përgjegjësitë e përdoruesit", body: "Bie dakord ta përdorësh KinetoFun vetëm për qëllime të ligjshme dhe në mënyrë që nuk cenon të drejtat e të tjerëve dhe nuk ua kufizon përdorimin dhe kënaqësinë e shërbimit." },
      { title: "Kufizimi i përgjegjësisë", body: "KinetoFun ofrohet \"siç është\". Nuk japim asnjë garanci, të shprehur ose të nënkuptuar, dhe me këtë mohojmë çdo garanci tjetër, përfshirë pa kufizim garancitë ose kushtet e nënkuptuara të tregtueshmërisë, përshtatshmërisë për një qëllim të caktuar dhe mosshkeljes së pronësisë intelektuale ose të drejtave të tjera." },
    ],
    contactTitle: "Na kontakto",
    contactBody: "Nëse ke pyetje për këto Kushte të Shërbimit, na shkruaj te",
  },
  cookies: {
    title: "Politika e cookie-ve",
    sections: [
      { title: "Çfarë janë cookie-t?", body: "Cookie-t janë copëza të vogla të dhënash që ruhen në pajisjen tënde dhe na ndihmojnë të mbajmë mend preferencat dhe të dhënat e hyrjes." },
      {
        title: "Si i përdorim cookie-t",
        body: "Përdorim cookie-t për:",
        list: [
          "Të të mbajtur të identifikuar në llogari",
          "Të mbajtur mend preferencat e ekranit dhe të gjuhës",
          "Të kuptuar si e përdor KinetoFun, që ta përmirësojmë shërbimin",
        ],
      },
      { title: "Cookie-t e seancës", body: "KinetoFun përdor cookie të sigurta httpOnly për të ruajtur seancën e hyrjes. Këto cookie fshihen kur del nga llogaria ose mbyll shfletuesin." },
      { title: "Menaxhimi i cookie-ve", body: "Cilësimet e cookie-ve mund t'i kontrollosh në shfletues. Megjithatë, çaktivizimi i tyre mund të ndikojë në përdorimin e KinetoFun." },
    ],
  },
  contact: {
    title: "Na kontakto",
    subtitle: "Do të na pëlqente të dëgjonim nga ti. Lidhu me ekipin e KinetoFun.",
    email: "Email",
    general: "Për pyetje të përgjithshme:",
    support: "Për ndihmë:",
    social: "Rrjetet sociale",
    socialBody: "Na ndiq në rrjetet sociale për përditësime dhe njoftime.",
    response: "Koha e përgjigjes",
    responseBody: "Zakonisht përgjigjemi brenda 24-48 orësh gjatë ditëve të punës.",
  },
};

export const legal = { en, sq };
