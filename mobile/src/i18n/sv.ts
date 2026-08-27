/**
 * Svenska. Källan.
 *
 * Ordnad efter var texten hör hemma, inte alfabetiskt, så att den som ändrar
 * en skärm hittar allt den skärmen säger på ett ställe.
 *
 * Texter med värden i sig är funktioner. Det gör att pluralformer kan skilja
 * sig mellan språk utan en pluralmotor, och att en översättare ser vilka
 * värden som finns att arbeta med.
 *
 * Ingen `as const` här med flit. Med den blir varje svensk mening sin egen
 * typ, och då kan ingen engelsk mening någonsin matcha. Utan den kontrolleras
 * fortfarande att alla nycklar finns, vilket är det som betyder något.
 */

export const sv = {
  /* Genomgående ---------------------------------------------------------- */
  common: {
    cancel: "Avbryt",
    save: "Spara",
    somethingWrong: "Något gick fel.",
    missing: "Något fattas",
    tryAgain: "Försök igen.",
    loading: "Laddar Haka på …",
    free: null as string | null,   // avsiktligt: gratis skrivs aldrig ut
  },

  /* Inloggning ----------------------------------------------------------- */
  login: {
    tagline: "Hitta folk i närheten som vill göra samma sak som du.",
    personalNumber: "Personnummer",
    personalNumberHint: "ÅÅÅÅMMDD-XXXX",
    testMode: "Testläge: valfritt tolvsiffrigt nummer fungerar.",
    signIn: "Logga in med BankID",
    assurance: "Alla här är verifierade med BankID. Ditt personnummer lagras aldrig.",
    keepOpen: "Håll appen öppen tills det är klart.",
    waiting: "Väntar på BankID …",
    openBankId: "Starta BankID-appen för att skriva under.",
    signInApp: "Skriv under i BankID-appen.",
    expired: "BankID hann gå ut. Försök igen.",
    userCancel: "Du avbröt inloggningen.",
    certificateErr: "Ditt BankID gick inte att använda. Kontakta din bank.",
    startFailed: "BankID kunde inte startas. Kontrollera att appen är installerad.",
    invalidParameters: "Något blev fel med inloggningen. Försök igen.",
    failed: "Inloggningen misslyckades. Försök igen.",
    timedOut: "Det tog för lång tid. Försök igen.",
  },

  /* Onboarding ----------------------------------------------------------- */
  onboarding: {
    welcome: "Välkommen!",
    intro: "Tre snabba saker, sen är du igång.",
    photo: "En bild på dig",
    photoWhy: "Alla här visar sitt ansikte. Det är därför det känns tryggt att tacka ja.",
    choosePhoto: "Välj profilbild",
    pickPhoto: "VÄLJ BILD",
    who: "Vem är du?",
    nameLabel: "Vad ska folk kalla dig?",
    namePlaceholder: "Förnamn räcker",
    bioLabel: "Kort om dig",
    bioPlaceholder: "Vad gör du helst en ledig lördag?",
    locating: "Letar upp ditt område …",
    areaUnknown: "Område okänt",
    areaPrivacy: "Vi sparar bara ungefär var du bor, aldrig din exakta adress.",
    interests: "Vad gillar du?",
    interestsHelp: (min: number) => `Välj minst ${min}. De styr vad du får se i flödet.`,
    start: "Kom igång",
    saving: "Sparar …",
    needPhoto: "Välj en bild på dig först.",
    needName: "Skriv vad du vill kallas.",
    needInterests: (n: number) => `Välj ${n} ${n === 1 ? "intresse" : "intressen"} till.`,
    needAll: "Fyll i alla tre steg först.",
    photoFailed: "Kunde inte välja bild",
    saveFailed: "Kunde inte spara",
  },

  /* Flödet --------------------------------------------------------------- */
  feed: {
    title: "Upptäck",
    yourArea: "Ditt område",
    post: "Lägg upp",
    soon: "Händer snart",
    planned: "Planerat",
    emptyTitle: "Tomt här just nu",
    emptyBody:
      "Ingen har lagt upp något i närheten än. Bli den första, det brukar räcka med en.",
    emptyFiltered: "Inga aktiviteter matchar filtret. Prova att ta bort något.",
    clearFilter: "Rensa filter",
    create: "Skapa aktivitet",
  },

  /* Kort och märkning ---------------------------------------------------- */
  card: {
    spontaneous: "Spontant",
    friendsOnly: "Bara kompisar",
    applied: "Ansökt",
    youreIn: "Du är med",
    yours: "Din aktivitet",
    full: "Fullt",
    openToAll: "Öppet för alla",
    joined: (n: number) => `${n} med`,
    spotsLeft: (n: number) => (n === 1 ? "1 plats kvar" : `${n} platser kvar`),
    answer: "Svara",
    wantIn: (n: number) => (n === 1 ? "1 vill haka på" : `${n} vill haka på`),
  },

  /* Aktiviteten ---------------------------------------------------------- */
  activity: {
    host: "Värd",
    map: "Karta",
    withSoFar: "Med hittills",
    spotsTaken: (taken: number, total: number) => `${taken} av ${total} platser tagna`,
    noLimit: (n: number) => `${n} med · ingen gräns`,
    costsOnSite: (kr: number) => `Kostar ${kr} kr på plats`,
    apply: "Jag vill haka på",
    openChat: "Öppna chatten",
    edit: "Ändra aktiviteten",
    cancel: "Ställ in aktiviteten",
    cancelTitle: "Ställ in aktiviteten?",
    cancelBody: "Alla som är med får veta i chatten.",
    cancelConfirm: "Ställ in",
    leave: "Hoppa av",
    leaveTitle: "Hoppa av?",
    leaveBody: "Du tas bort från aktiviteten och dess chatt.",
    applicants: (n: number) => `Vill haka på (${n})`,
    applicantsHelp: "Du väljer vilka. De andra får bara veta att platserna gick åt.",
    acceptCreatesChat: "Accepterar du någon hamnar ni direkt i en chatt tillsammans.",
    allTaken: "Alla platser är tagna. Hoppar någon av kan du acceptera fler.",
    accept: "Acceptera",
    decline: "Nej tack",
    cancelledBadge: "Inställd",
    pastBadge: "Har varit",
    repeat: "Gör om det här",
    withdraw: "Ta tillbaka ansökan",
    hostCancelled: "Värden ställde in.",
    couldNotLoad: "Kunde inte hämta aktiviteten",
  },

  /* Haka på -------------------------------------------------------------- */
  apply: {
    title: (activity: string) => `Haka på ${activity}`,
    why: "Skriv en rad till värden. Det är den som gör att du syns bland de andra som vill med.",
    yourLine: "Din rad",
    yourLinePlaceholder: "Varför vill du haka på?",
    tooShort: "Skriv någon rad, det behöver inte vara långt.",
    experience: "Hur van är du?",
    experienceHelp: "Frivilligt. Hjälper värden planera, och att vara ny är aldrig ett minus.",
    firstTime: "Första gången",
    some: "Gjort det förr",
    often: "Gör det ofta",
    payOnSite: "Ni betalar var för sig på plats.",
    send: "Skicka",
    failed: "Kunde inte haka på",
  },
};
