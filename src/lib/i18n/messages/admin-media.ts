const en = {
  cover: {
    failed: "Upload failed.",
    uploadAria: "Upload cover image",
    preview: "Cover preview",
    replace: "Replace image",
    upload: "Upload image",
    remove: "Remove",
    hint: "PNG, JPG, WEBP or GIF · up to 5MB. Drag & drop or click. The gradient is used when empty.",
  },
  secretWorld: {
    title: (game: string) => `Secret world: ${game}`,
    currently: (n: number) => `Currently ${n} tickets`,
    currentlyFree: "Currently free to play",
    body: "New players must unlock a secret world with tickets before playing. Anyone who has already played this game, or has unlocked it, keeps access. A regular player earns roughly 20–40 tickets a day.",
    price: "Price in tickets",
    makeFree: "Make free again",
    update: "Update price",
    make: "Make secret world",
  },
  icons: {
    choose: "Choose icon",
    search: "Search icons…",
    noMatch: (q: string) => `No icons match “${q}”.`,
  },
};

const sq: typeof en = {
  cover: {
    failed: "Ngarkimi dështoi.",
    uploadAria: "Ngarko imazhin e kopertinës",
    preview: "Pamja e kopertinës",
    replace: "Zëvendëso imazhin",
    upload: "Ngarko imazh",
    remove: "Hiq",
    hint: "PNG, JPG, WEBP ose GIF · deri në 5 MB. Tërhiq dhe lësho ose kliko. Kur mungon, përdoret gradienti.",
  },
  secretWorld: {
    title: (game: string) => `Botë e fshehtë: ${game}`,
    currently: (n: number) => `Aktualisht ${n} bileta`,
    currentlyFree: "Aktualisht falas",
    body: "Lojtarët e rinj duhet ta zhbllokojnë një botë të fshehtë me bileta para se ta luajnë. Kushdo që e ka luajtur ose e ka zhbllokuar këtë lojë e ruan qasjen. Një lojtar i zakonshëm fiton rreth 20–40 bileta në ditë.",
    price: "Çmimi në bileta",
    makeFree: "Bëje përsëri falas",
    update: "Përditëso çmimin",
    make: "Bëje botë të fshehtë",
  },
  icons: {
    choose: "Zgjidh ikonën",
    search: "Kërko ikona…",
    noMatch: (q: string) => `Asnjë ikonë nuk përputhet me “${q}”.`,
  },
};

export const adminMedia = { en, sq };
