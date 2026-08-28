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

  /* Skärmnamn och flikar -------------------------------------------------- */
  nav: {
    discover: "Upptäck",
    mine: "Mina",
    chats: "Chattar",
    profile: "Profil",
    friends: "Kompisar",
    planSomething: "Planera något",
    spontaneousNow: "Spontant nu",
    edit: "Ändra",
    doItAgain: "Göra om det?",
  },

  /* Väljaren mellan planerat och spontant --------------------------------- */
  chooser: {
    title: "Vad vill du lägga upp?",
    close: "Stäng",
    spontaneous: "Spontant nu",
    spontaneousBody:
      "Något du vill göra inom några timmar. Går ut till folk i närheten direkt.",
    planned: "Planera något",
    plannedBody: "En aktivitet längre fram, med bild och beskrivning.",
  },

  /* Kostnad --------------------------------------------------------------- */
  price: {
    label: "Kostar något på plats",
    help: "Bastu, bana, entré. Ni betalar var för sig, inget går via appen.",
    amount: "Ungefär hur mycket per person?",
  },

  /* Chattlistan ----------------------------------------------------------- */
  chats: {
    emptyTitle: "Inga chattar än",
    emptyBody:
      "När någon accepterar din ansökan, eller du accepterar någon annans, "
      + "hamnar ni i en chatt här.",
    findSomething: "Hitta något att göra",
    sayHi: "Säg hej!",
  },

  /* Gör om det ------------------------------------------------------------ */
  again: {
    question: "Skulle du göra om det?",
    yes: "Ja gärna",
  },

  /* Skapa: gemensamt för planerat och spontant ---------------------------- */
  create: {
    what: "Vad?",
    whatOwn: "Eller skriv något eget",
    whatPlaceholder: "Vad är du sugen på?",
    when: "När?",
    howLong: "Hur länge?",
    where: "Var?",
    whereLocating: "Letar upp var du är …",
    nearby: "I närheten",
    howMany: "Hur många kan haka på?",
    noLimit: "Spelar ingen roll",
    whoSees: "Vem får se?",
    everyone: "Alla i närheten",
    friendsOnly: "Bara kompisar",
    post: "Lägg upp",
    posting: "Lägger upp …",
    failed: "Gick inte att lägga upp",
    needTitle: "Skriv vad du vill göra.",
    waitingForLocation: "Väntar på din position.",
    hours: (n: number) => `${n} tim`,
    spontaneousIntro:
      "Går ut till folk i närheten som gillar samma sak. Den försvinner av sig "
      + "själv när den har varit.",
    now: "Nu",
    inMinutes: (n: number) => `Om ${n} min`,
    inHours: (n: number) => (n === 1 ? "Om 1 h" : `Om ${n} h`),
  },

  /* Förslagen i spontanformuläret ----------------------------------------- */
  suggestions: {
    fika: "Ta en fika",
    walk: "Promenad",
    run: "Löprunda",
    bike: "Cykla en sväng",
    gym: "Gå på gymmet",
    lunch: "Käka lunch",
    game: "Spela något",
    ball: "Kasta boll",
    swim: "Gå till badet",
    photo: "Fota en runda",
  },

  /* Profilen -------------------------------------------------------------- */
  profile: {
    name: "Namn",
    about: "Om dig",
    changePhoto: "Byt profilbild",
    photoFailed: "Kunde inte byta bild",
    saveFailed: "Kunde inte spara",
    needInterest: "Välj minst ett intresse.",
    friends: "Kompisar",
    none: "Inga än",
    onePerson: "1 person",
    people: (n: number) => `${n} personer`,
    waiting: (n: number) => `${n} väntar på svar`,
    signOut: "Logga ut",
    signOutTitle: "Logga ut?",
    signOutBody: "Du loggar in igen med BankID.",
    testMode: "Testläge",
    reset: "Börja om från början",
    resetTitle: "Börja om?",
    resetBody: "Allt du gjort i testläget försvinner och exempeldatan återställs.",
    resetConfirm: "Börja om",
    deleteAccount: "Radera mitt konto",
    deleteTitle: "Radera ditt konto?",
    deleteBody:
      "Din profil, dina aktiviteter och dina kompisrelationer tas bort. "
      + "Aktiviteter du är värd för ställs in så att de som tackat ja får veta. "
      + "Det går inte att ångra.",
    deleteContinue: "Fortsätt",
    deleteSureTitle: "Säker?",
    deleteSureBody: "Kontot raderas direkt och går inte att få tillbaka.",
    deleteConfirm: "Radera",
    deleteNo: "Nej",
    deleteFailed: "Gick inte att radera",
  },

  /* Skapa planerat, det som bara finns där ---------------------------------- */
  plan: {
    coverRequired: "Krav, det är den som får folk att haka på",
    pickCover: "Välj en bild",
    chooseCover: "Välj omslagsbild",
    coverFailed: "Kunde inte välja bild",
    titleLabel: "Vad ska ni göra?",
    titlePlaceholder: "Fiska i Drevviken",
    descriptionLabel: "Berätta lite mer",
    descriptionPlaceholder: "Vad ska man ta med? Behöver man kunna något?",
    placePlaceholder: "Drevviken, Skarpnäck",
    useMyLocation: "Använd min position",
    useMyLocationAgain: "Använd min position igen",
    locationFailed: "Kunde inte hämta platsen",
    pickDay: "Välj dag",
    pickTime: "Välj tid",
    whoSees: "Vem får se den?",
    publicHelp: "Syns i flödet för alla som är i området.",
    friendsHelp: "Ingen annan ser den. Bra för sånt du bara delar med folk du känner.",
    noLimit: "Ingen gräns",
    needCover: "En bild krävs.",
    needTitle: "Ge aktiviteten en titel.",
    needPlace: "Fyll i var ni ska vara.",
    needFutureTime: "Välj en tid som ligger framåt.",
    needAll: "Fyll i allt först.",
    createFailed: "Kunde inte skapa aktiviteten",
    saveChanges: "Spara ändringar",
    saving: "Sparar …",
    loadFailed: "Kunde inte hämta aktiviteten",
    alreadyJoined: (n: number) =>
      n === 1 ? "1 person är redan med." : `${n} personer är redan med.`,
    cannotLower: (n: number) => `Redan ${n} med, går inte att sänka under det.`,
    tooShortTitle: "Titeln behöver minst tre tecken.",
    willTellOne: "Personen som är med får veta i chatten",
    willTellMany: (n: number) => `De ${n} som är med får veta i chatten`,
    timeChanged: "Tiden har ändrats.",
    placeChanged: "Platsen har ändrats.",
    bothChanged: "Både tiden och platsen har ändrats.",
  },

  /* Chatten --------------------------------------------------------------- */
  chat: {
    placeholder: "Skriv något …",
    openFailed: "Kunde inte öppna chatten",
    close: "Stäng",
    listHelp: "Skriv punkterna i textfältet, en per rad, och tryck på listknappen igen.",
    placeExample: "här är bryggan",
    listExample: "här är vad vi ska ta med",
  },

  /* Kompisar -------------------------------------------------------------- */
  friends: {
    emptyTitle: "Inga kompisar än",
    emptyBody:
      "När du varit med om något kul med någon kan du fråga om ni ska bli "
      + "kompisar. Då ser ni varandras privata aktiviteter.",
    findSomething: "Hitta något att göra",
    youAsked: "Du har frågat",
    waiting: "Väntar på svar",
    accept: "Ja gärna",
  },

  /* En annan person ------------------------------------------------------- */
  person: {
    loadFailed: "Kunde inte hämta profilen",
    areFriends: "Ni är kompisar",
    accept: "Ja gärna",
    message: "Skicka meddelande",
    chatNotYet: "Kan inte öppna chatt än",
    report: "Anmäl",
    block: "Blockera",
    reportOther: "Något annat",
    reportThanks: "Vi tittar på det. Du kan även blockera personen.",
    blockBody: "Ni ser inte längre varandras aktiviteter och kan inte kontakta varandra.",
    removeFriend: "Ta bort som kompis",
    removeFriendBody:
      "Ni kan fortfarande haka på varandras aktiviteter. Personen får ingen "
      + "avisering om det här.",
    remove: "Ta bort",
    hosted: "värd för",
    joined: "varit med på",
  },

  /* Mina aktiviteter ------------------------------------------------------ */
  mine: {
    ahead: "Framåt",
    noHosting: "Du är inte värd för något än",
    noHostingBody: "Lägg upp något du ändå ska göra. Fiska, springa, spela, folk hakar på.",
    noJoined: "Du har inte hakat på något än",
    noJoinedBody: "Kika i Upptäck och ansök om något som ser kul ut.",
    toDiscover: "Till Upptäck",
    bookNext: "Boka in nästa",
    bothWant: "NI VILL BÅDA",
  },

  /* Intressen. Slugen är nyckeln i databasen, texten är bara etikett. */
  interests: {
    fiske: "Fiske",
    vandring: "Vandring",
    lopning: "Löpning",
    cykling: "Cykling",
    skateboard: "Skateboard",
    padel: "Padel",
    fotboll: "Fotboll",
    golf: "Golf",
    gym: "Gym & träning",
    bad: "Bad & kallbad",
    paddling: "Paddling & kajak",
    skidor: "Skidor & snö",
    svamp: "Svamp & bär",
    tradgard: "Trädgård & odling",
    handarbete: "Handarbete",
    matlagning: "Matlagning",
    fika: "Fika",
    middag: "Middag & krog",
    bradspel: "Brädspel",
    tvspel: "TV-spel",
    musik: "Musik & konsert",
    film: "Film & bio",
    bocker: "Böcker",
    foto: "Foto",
    konst: "Konst & museum",
    bygga: "Bygga & meka",
    motor: "Motor & bil",
    hundar: "Hundpromenad",
    foraldrar: "Föräldraliv",
    sprak: "Språkutbyte",
    teknik: "Teknik & kod",
    loppis: "Loppis & fynd",
  },

  /* Datum, tid och avstånd ------------------------------------------------ */
  when: {
    today: "Idag",
    tomorrow: "Imorgon",
    justNow: "nyss",
    minutes: (n: number) => `${n} min`,
    hours: (n: number) => `${n} tim`,
    yesterday: "igår",
    yesterdayCapital: "Igår",
    todayCapital: "Idag",
  },
  distance: {
    rightHere: "här intill",
    metres: (m: number) => `${m} m`,
    kilometres: (km: string) => `${km} km`,
  },
  place: {
    unknownArea: "Okänt område",
  },
  permission: {
    photos: "Haka på behöver tillgång till dina bilder för att du ska kunna välja en.",
    camera: "Haka på behöver tillgång till kameran för att du ska kunna ta en bild.",
  },

  cancelledNotice: { text: "Aktiviteten är inställd." },

  credentials: {
    noActivities: "Inga aktiviteter än",
    activities: (n: number) => (n === 1 ? "1 aktivitet" : `${n} aktiviteter`),
    memberSince: (when: string) => `Med sedan ${when}`,
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
