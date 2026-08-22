/*
  Kör igenom appens flöden mot mock-backenden, samma kod som telefonen kör.

  Det här fångar logikfel: att en knapp inte gör något, att ett steg inte går
  att ta sig ur, att ett värde försvinner. Det fångar inte layoutfel, för
  ingenting ritas här.
*/
const Module = require("module");
const path = require("path");

const BUILD = path.join(__dirname, "..", ".flode");

/* Bilder finns inte i Node. De behöver bara ha ett värde. */
for (const ext of [".jpg", ".jpeg", ".png"]) {
  require.extensions[ext] = (mod, file) => { mod.exports = { uri: "file://" + file }; };
}

/* Minnesvariant av AsyncStorage och det enda som används ur react-native. */
const memory = new Map();
const stubs = {
  "react-native": {
    __esModule: true,
    Image: { resolveAssetSource: (m) => ({ uri: (m && m.uri) || "stub" }) },
  },
  "@react-native-async-storage/async-storage": {
    __esModule: true,
    default: {
      getItem: async (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: async (k, v) => { memory.set(k, v); },
      removeItem: async (k) => { memory.delete(k); },
      multiRemove: async (ks) => { ks.forEach((k) => memory.delete(k)); },
    },
  },
};

const IMAGE = /\.(jpe?g|png)$/i;

const realResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (stubs[request]) return "stub:" + request;
  // Bilderna ligger utanför den kompilerade trädet. Namnet räcker som värde.
  if (IMAGE.test(request)) return "image:" + request;
  if (request.startsWith("@/")) {
    return realResolve.call(this, path.join(BUILD, request.slice(2)), ...rest);
  }
  return realResolve.call(this, request, ...rest);
};
const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (stubs[request]) return stubs[request];
  if (IMAGE.test(request)) return { uri: "asset://" + path.basename(request) };
  return realLoad.call(this, request, ...rest);
};

/* --- liten testram ------------------------------------------------------ */
let pass = 0;
const fails = [];
function check(label, condition, detail) {
  if (condition) { pass++; console.log("  ok   " + label); }
  else { fails.push(label + (detail ? "  <- " + detail : "")); console.log("  FEL  " + label); }
}
async function shouldThrow(label, fn) {
  try { await fn(); check(label, false, "inget fel kastades"); }
  catch { check(label, true); }
}

(async () => {
  const { MockBackend } = require(path.join(BUILD, "api/mock/index.js"));
  const api = new MockBackend();

  console.log("\nInloggning");
  const start = await api.bankIdStart("199001011234");
  check("bankIdStart ger en order", Boolean(start.orderRef));
  let collect = await api.bankIdCollect(start.orderRef);
  check("signering är först pågående", collect.status === "pending");
  await new Promise((r) => setTimeout(r, 3200));
  collect = await api.bankIdCollect(start.orderRef);
  check("signering blir klar", collect.status === "complete", JSON.stringify(collect));
  check("ny användare skickas till onboarding", collect.needsOnboarding === true);

  console.log("\nOnboarding");
  let me = await api.getMyProfile();
  check("profil finns efter inloggning", Boolean(me));
  check("profilen är halvfärdig", me.needsOnboarding === true);
  await api.updateMyProfile({
    displayName: "Jakob", bio: "Testar appen", avatarUrl: "file://avatar.jpg",
    interests: ["fiske", "lopning", "fika"],
    homeLat: 59.2617, homeLng: 18.1204, homeAreaLabel: "Skarpnäck",
  });
  me = await api.getMyProfile();
  check("namnet sparades", me.displayName === "Jakob", me.displayName);
  check("onboarding är avklarad", me.needsOnboarding === false);

  console.log("\nFlödet");
  const feed = await api.discover({ radiusKm: 25 });
  check("flödet har aktiviteter", feed.length > 0, "antal " + feed.length);
  check("alla kort har omslag", feed.every((a) => Boolean(a.coverUrl)));
  check("inget kort saknar avstånd", feed.every((a) => typeof a.distanceM === "number"));

  console.log("\nVärdvyn, den som skulle vara svår");
  const mine = (await api.myActivities()).hosting;
  check("jag är värd för något", mine.length > 0, "antal " + mine.length);
  const detail = await api.getActivity(mine[0].id);
  check("det finns flera som vill haka på", detail.applicants.length >= 3,
        "antal " + detail.applicants.length);
  check("alla sökande har skrivit en rad",
        detail.applicants.every((a) => Boolean(a.introMessage)));
  check("nivå syns för värden",
        detail.applicants.some((a) => Boolean(a.experience)));

  console.log("\nAtt acceptera skapar chatten");
  const first = detail.applicants[0];
  const decided = await api.decideApplication(first.participantId, true);
  check("statusen blev accepterad", decided.status === "accepted");
  const after = await api.getActivity(mine[0].id);
  check("personen flyttades till accepterade",
        after.accepted.some((a) => a.participantId === first.participantId));
  check("en tråd finns nu", Boolean(after.threadId));
  const messages = await api.listMessages(after.threadId);
  check("tråden går att läsa", Array.isArray(messages));
  await api.sendMessage(after.threadId, { kind: "text", body: "Vi ses vid bryggan" });
  const after2 = await api.listMessages(after.threadId);
  check("meddelandet kom fram", after2.some((m) => m.body === "Vi ses vid bryggan"));

  console.log("\nAtt tacka nej");
  const second = after.applicants[0];
  if (second) {
    const no = await api.decideApplication(second.participantId, false);
    check("nej ger status declined", no.status === "declined");
  }

  console.log("\nAtt haka på någon annans aktivitet");
  const others = (await api.discover({ radiusKm: 25 }))
    .filter((a) => !a.isMine);
  check("det finns andras aktiviteter", others.length > 0);
  await shouldThrow("tom rad avvisas", () => api.applyToActivity(others[0].id, ""));
  await shouldThrow("för kort rad avvisas", () => api.applyToActivity(others[0].id, "hej"));
  await api.applyToActivity(others[0].id, "Har velat testa det här länge.", "first_time");
  const applied = await api.getActivity(others[0].id);
  check("min ansökan syns", Boolean(applied.myParticipantId));

  console.log("\nSkapa en aktivitet");
  const created = await api.createActivity({
    title: "Springa i Nackareservatet",
    description: "Lugnt tempo, cirka en timme.",
    category: "lopning",
    coverUrl: "file://cover.jpg",
    locationName: "Nackareservatet",
    lat: 59.2907, lng: 18.1289,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
    visibility: "public", capacity: 4, minAge: null,
  });
  check("aktiviteten skapades", Boolean(created.id));
  const mineNow = (await api.myActivities()).hosting;
  check("den syns bland mina", mineNow.some((a) => a.id === created.id));

  console.log("\nSpontant");
  await shouldThrow("planerad utan bild avvisas", () => api.createActivity({
    kind: "planned", title: "Utan bild", coverUrl: null,
    locationName: "Nånstans", lat: 59.26, lng: 18.12,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
    visibility: "public", capacity: 4, minAge: null,
  }));
  await shouldThrow("spontan långt fram avvisas", () => api.createActivity({
    kind: "now", title: "För långt fram", coverUrl: null,
    locationName: "Nånstans", lat: 59.26, lng: 18.12,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
    visibility: "public", capacity: 4, minAge: null,
  }));

  const spontan = await api.createActivity({
    kind: "now", title: "Ta en fika", category: "fika", coverUrl: null,
    locationName: "Skarpnäcks torg", lat: 59.2617, lng: 18.1204,
    startsAt: new Date(Date.now() + 30 * 60000).toISOString(),
    endsAt: new Date(Date.now() + 150 * 60000).toISOString(),
    visibility: "public", capacity: 3, minAge: null,
  });
  check("spontan utan bild går att skapa", Boolean(spontan.id));
  check("den är märkt som spontan", spontan.kind === "now", spontan.kind);
  check("den saknar omslag, klienten ritar ett", spontan.coverUrl === null);
  const feedNow = await api.discover({ radiusM: 25000 });
  check("den syns i flödet", feedNow.some((a) => a.id === spontan.id));
  check("planerade är fortfarande planerade",
        feedNow.filter((a) => a.id !== spontan.id).every((a) => a.kind === "planned"));

  console.log("\nKompisar");
  const people = (await api.discover({ radiusKm: 25 }))
    .map((a) => a.hostId).filter((id) => id !== me.id);
  if (people.length) {
    await api.requestFriend(people[0]);
    const requests = await api.listFriendRequests();
    const sent = requests.find((r) => r.profile.id === people[0] && !r.incoming);
    check("min skickade förfrågan syns", Boolean(sent),
          "fick " + JSON.stringify(requests.map((r) => r.incoming)));
    const friends = await api.listFriends();
    check("kompislistan går att läsa", Array.isArray(friends));
  }

  console.log("\nUtloggning");
  await api.signOut();
  const gone = await api.getMyProfile();
  check("ingen profil efter utloggning", gone === null);

  console.log("\n" + "=".repeat(58));
  console.log(pass + " klara, " + fails.length + " fel");
  if (fails.length) { fails.forEach((f) => console.log("  - " + f)); process.exit(1); }
})().catch((e) => { console.error("\nKRASCH:", e.message, "\n", e.stack); process.exit(1); });
