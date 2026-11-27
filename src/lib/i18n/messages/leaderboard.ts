const en = {
  title: "Leaderboards",
  subtitle: "Top players across KinetoFun.",
  globalTitle: "Global best scores",
  gameTitle: (game: string) => `${game} leaderboard`,
  global: "Global",
  games: "Games",
  noGames: "No games found",
  empty: "No scores yet — be the first to play!",
  table: {
    empty: "No scores recorded yet.",
    rank: "Rank",
    player: "Player",
    score: "Score",
    you: "(you)",
  },
};

const sq: typeof en = {
  title: "Renditjet",
  subtitle: "Lojtarët më të mirë në KinetoFun.",
  globalTitle: "Rezultatet më të mira globale",
  gameTitle: (game: string) => `Renditja e ${game}`,
  global: "Globale",
  games: "Lojërat",
  noGames: "Nuk u gjet asnjë lojë",
  empty: "Ende pa rezultate — bëhu i pari që luan!",
  table: {
    empty: "Ende nuk ka rezultate.",
    rank: "Vendi",
    player: "Lojtari",
    score: "Rezultati",
    you: "(ti)",
  },
};

export const leaderboard = { en, sq };
