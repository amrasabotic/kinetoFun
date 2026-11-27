type AuditDetails = {
  name?: string;
  count?: number;
  unlockCost?: number;
  tvReady?: boolean;
  role?: string;
  delta?: number;
};

const q = (name?: string) => (name ? `“${name}”` : "");

const en = {
  nav: {
    dashboard: "Dashboard",
    users: "Users",
    categories: "Categories",
    games: "Games",
    leaderboards: "Leaderboards",
    subscriptions: "Subscriptions",
    settings: "Settings",
    auditLogs: "Audit Logs",
  },
  shell: {
    console: "Admin Console",
    menu: "Menu",
    expand: "Expand sidebar",
    collapse: "Collapse sidebar",
    admin: "Admin",
    openMenu: "Open menu",
    search: "Search",
    searchPlaceholder: "Search…",
    notifications: "Notifications",
    caughtUp: "You're all caught up",
    noNotifications: "No new notifications.",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
  },
  ui: {
    results: (total: number, page: number, pages: number) =>
      `${total} ${total === 1 ? "result" : "results"} · Page ${page} of ${pages}`,
    previousPage: "Previous page",
    nextPage: "Next page",
    view: { table: "Table view", card: "Card view" },
    actions: "Actions",
    confirm: "Confirm",
    cancel: "Cancel",
    working: "Working…",
  },
  audit: {
    labels: {
      "category.created": "Created category",
      "category.updated": "Updated category",
      "category.deleted": "Deleted category",
      "category.enabled": "Enabled category",
      "category.disabled": "Disabled category",
      "category.reordered": "Reordered categories",
      "game.created": "Created game",
      "game.updated": "Updated game",
      "game.published": "Published game",
      "game.archived": "Archived game",
      "game.deleted": "Deleted game",
      "game.bulk_publish": "Bulk published games",
      "game.bulk_archive": "Bulk archived games",
      "game.bulk_draft": "Bulk drafted games",
      "game.bulk_delete": "Bulk deleted games",
      "game.bulk_category": "Bulk recategorized games",
      "game.secret_world_updated": "Updated secret world",
      "game.tv_ready_updated": "Changed TV listing",
      "user.role_updated": "Updated user role",
      "user.deleted": "Deleted user",
      "user.tickets_adjusted": "Adjusted tickets",
      "user.registered": "Registered",
      "leaderboard.score_deleted": "Deleted score",
      "leaderboard.reset": "Reset leaderboard",
      "subscription.granted": "Granted pro subscription",
      "subscription.revoked": "Revoked subscription",
      "settings.updated": "Updated platform settings",
    } as Record<string, string>,
    sentence: (action: string, d: AuditDetails): string | null => {
      const n = d.name;
      const many = d.count ?? "multiple";
      switch (action) {
        case "category.created": return `Created category${n ? ` ${q(n)}` : ""}`;
        case "category.updated": return `Updated category${n ? ` ${q(n)}` : ""}`;
        case "category.deleted": return `Deleted category${n ? ` ${q(n)}` : ""}`;
        case "category.enabled": return `Enabled category${n ? ` ${q(n)}` : ""}`;
        case "category.disabled": return `Disabled category${n ? ` ${q(n)}` : ""}`;
        case "category.reordered": return `Reordered ${d.count ?? ""} categories`.replace("  ", " ");
        case "game.created": return `Created game${n ? ` ${q(n)}` : ""}`;
        case "game.updated": return `Updated game${n ? ` ${q(n)}` : ""}`;
        case "game.published": return `Published game${n ? ` ${q(n)}` : ""}`;
        case "game.archived": return `Archived game${n ? ` ${q(n)}` : ""}`;
        case "game.deleted": return "Deleted a game";
        case "game.bulk_publish": return `Published ${many} games`;
        case "game.bulk_archive": return `Archived ${many} games`;
        case "game.bulk_delete": return `Deleted ${many} games`;
        case "game.bulk_category": return `Recategorized ${many} games`;
        case "game.secret_world_updated":
          return d.unlockCost
            ? `Made ${n ? q(n) : "a game"} a secret world for ${d.unlockCost} tickets`
            : `Made ${n ? q(n) : "a game"} free to play again`;
        case "game.tv_ready_updated":
          return `${d.tvReady ? "Showed" : "Hid"} ${n ? q(n) : "a game"} ${d.tvReady ? "on" : "from"} the TV`;
        case "user.role_updated": return `Set ${n ?? "a user"} to ${d.role ?? "a new role"}`;
        case "user.deleted": return "Deleted a user account";
        case "user.tickets_adjusted": {
          const delta = d.delta ?? 0;
          return `${delta >= 0 ? "Gave" : "Removed"} ${Math.abs(delta)} tickets ${delta >= 0 ? "to" : "from"} ${n ?? "a user"}`;
        }
        case "user.registered": return `${n ?? "A new user"} registered an account`;
        case "leaderboard.score_deleted": return "Deleted a score from leaderboard";
        case "leaderboard.reset": return "Reset leaderboard for a game";
        case "subscription.granted": return `Granted pro subscription to ${n ?? "a user"}`;
        case "subscription.revoked": return `Revoked subscription for ${n ?? "a user"}`;
        case "settings.updated": return "Updated platform settings";
        default: return null;
      }
    },
  },
};

const sq: typeof en = {
  nav: {
    dashboard: "Paneli",
    users: "Përdoruesit",
    categories: "Kategoritë",
    games: "Lojërat",
    leaderboards: "Renditjet",
    subscriptions: "Abonimet",
    settings: "Cilësimet",
    auditLogs: "Regjistri i auditimit",
  },
  shell: {
    console: "Paneli i administrimit",
    menu: "Menuja",
    expand: "Zgjero shiritin anësor",
    collapse: "Ngushto shiritin anësor",
    admin: "Administrimi",
    openMenu: "Hap menunë",
    search: "Kërko",
    searchPlaceholder: "Kërko…",
    notifications: "Njoftimet",
    caughtUp: "Je në jetë me gjithçka",
    noNotifications: "Nuk ka njoftime të reja.",
    profile: "Profili",
    settings: "Cilësimet",
    logout: "Dil",
  },
  ui: {
    results: (total: number, page: number, pages: number) =>
      `${total} ${total === 1 ? "rezultat" : "rezultate"} · Faqja ${page} nga ${pages}`,
    previousPage: "Faqja e mëparshme",
    nextPage: "Faqja tjetër",
    view: { table: "Pamje tabele", card: "Pamje kartash" },
    actions: "Veprime",
    confirm: "Konfirmo",
    cancel: "Anulo",
    working: "Po punohet…",
  },
  audit: {
    labels: {
      "category.created": "Krijoi kategori",
      "category.updated": "Përditësoi kategori",
      "category.deleted": "Fshiu kategori",
      "category.enabled": "Aktivizoi kategori",
      "category.disabled": "Çaktivizoi kategori",
      "category.reordered": "Rirenditi kategoritë",
      "game.created": "Krijoi lojë",
      "game.updated": "Përditësoi lojë",
      "game.published": "Publikoi lojë",
      "game.archived": "Arkivoi lojë",
      "game.deleted": "Fshiu lojë",
      "game.bulk_publish": "Publikoi lojëra në grup",
      "game.bulk_archive": "Arkivoi lojëra në grup",
      "game.bulk_draft": "Ktheu lojëra në draft",
      "game.bulk_delete": "Fshiu lojëra në grup",
      "game.bulk_category": "Ndryshoi kategorinë e lojërave",
      "game.secret_world_updated": "Përditësoi botë të fshehtë",
      "game.tv_ready_updated": "Ndryshoi listimin në TV",
      "user.role_updated": "Ndryshoi rolin e përdoruesit",
      "user.deleted": "Fshiu përdorues",
      "user.tickets_adjusted": "Ndryshoi biletat",
      "user.registered": "U regjistrua",
      "leaderboard.score_deleted": "Fshiu rezultat",
      "leaderboard.reset": "Rivendosi renditjen",
      "subscription.granted": "Dha abonim pro",
      "subscription.revoked": "Anuloi abonim",
      "settings.updated": "Përditësoi cilësimet e platformës",
    },
    sentence: (action: string, d: AuditDetails): string | null => {
      const n = d.name;
      const many = d.count ?? "disa";
      switch (action) {
        case "category.created": return `Krijoi kategorinë${n ? ` ${q(n)}` : ""}`;
        case "category.updated": return `Përditësoi kategorinë${n ? ` ${q(n)}` : ""}`;
        case "category.deleted": return `Fshiu kategorinë${n ? ` ${q(n)}` : ""}`;
        case "category.enabled": return `Aktivizoi kategorinë${n ? ` ${q(n)}` : ""}`;
        case "category.disabled": return `Çaktivizoi kategorinë${n ? ` ${q(n)}` : ""}`;
        case "category.reordered": return d.count ? `Rirenditi ${d.count} kategori` : "Rirenditi kategoritë";
        case "game.created": return `Krijoi lojën${n ? ` ${q(n)}` : ""}`;
        case "game.updated": return `Përditësoi lojën${n ? ` ${q(n)}` : ""}`;
        case "game.published": return `Publikoi lojën${n ? ` ${q(n)}` : ""}`;
        case "game.archived": return `Arkivoi lojën${n ? ` ${q(n)}` : ""}`;
        case "game.deleted": return "Fshiu një lojë";
        case "game.bulk_publish": return `Publikoi ${many} lojëra`;
        case "game.bulk_archive": return `Arkivoi ${many} lojëra`;
        case "game.bulk_delete": return `Fshiu ${many} lojëra`;
        case "game.bulk_category": return `Ndryshoi kategorinë e ${many} lojërave`;
        case "game.secret_world_updated":
          return d.unlockCost
            ? `E bëri ${n ? q(n) : "një lojë"} botë të fshehtë për ${d.unlockCost} bileta`
            : `E bëri ${n ? q(n) : "një lojë"} përsëri falas`;
        case "game.tv_ready_updated":
          return d.tvReady
            ? `Shfaqi ${n ? q(n) : "një lojë"} në TV`
            : `Fshehu ${n ? q(n) : "një lojë"} nga TV`;
        case "user.role_updated": return `I vendosi ${n ?? "një përdoruesi"} rolin ${d.role ?? "e ri"}`;
        case "user.deleted": return "Fshiu një llogari përdoruesi";
        case "user.tickets_adjusted": {
          const delta = d.delta ?? 0;
          return delta >= 0
            ? `I dha ${Math.abs(delta)} bileta ${n ?? "një përdoruesi"}`
            : `I hoqi ${Math.abs(delta)} bileta ${n ?? "një përdoruesi"}`;
        }
        case "user.registered": return `${n ?? "Një përdorues i ri"} krijoi një llogari`;
        case "leaderboard.score_deleted": return "Fshiu një rezultat nga renditja";
        case "leaderboard.reset": return "Rivendosi renditjen e një loje";
        case "subscription.granted": return `I dha abonim pro ${n ?? "një përdoruesi"}`;
        case "subscription.revoked": return `Anuloi abonimin e ${n ?? "një përdoruesi"}`;
        case "settings.updated": return "Përditësoi cilësimet e platformës";
        default: return null;
      }
    },
  },
};

export const admin = { en, sq };
