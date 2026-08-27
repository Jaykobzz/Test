/**
 * English.
 *
 * Typed against the Swedish dictionary, so a forgotten line is a compile
 * error and never a Swedish sentence appearing in an English app.
 *
 * This is not a literal translation. "Haka på" has no good English word, and
 * the tone matters more than the wording: plain, unexcited, never selling.
 * The app should read the way a neighbour talks, in either language.
 */

import type { sv } from "./sv";

export const en: typeof sv = {
  common: {
    cancel: "Cancel",
    save: "Save",
    somethingWrong: "Something went wrong.",
    missing: "Something is missing",
    tryAgain: "Try again.",
    loading: "Loading Haka på …",
    free: null,
  },

  login: {
    tagline: "Find people nearby who want to do the same thing as you.",
    personalNumber: "Personal number",
    personalNumberHint: "YYYYMMDD-XXXX",
    testMode: "Test mode: any twelve digits will work.",
    signIn: "Sign in with BankID",
    assurance: "Everyone here is verified with BankID. Your personal number is never stored.",
    keepOpen: "Keep the app open until it is done.",
    waiting: "Waiting for BankID …",
    openBankId: "Open the BankID app to sign.",
    signInApp: "Sign in the BankID app.",
    expired: "BankID timed out. Try again.",
    userCancel: "You cancelled the sign-in.",
    certificateErr: "Your BankID could not be used. Contact your bank.",
    startFailed: "BankID could not start. Check that the app is installed.",
    invalidParameters: "Something went wrong with the sign-in. Try again.",
    failed: "Sign-in failed. Try again.",
    timedOut: "That took too long. Try again.",
  },

  onboarding: {
    welcome: "Welcome!",
    intro: "Three quick things and you are set.",
    photo: "A photo of you",
    photoWhy: "Everyone here shows their face. That is what makes it feel safe to say yes.",
    choosePhoto: "Choose a profile photo",
    pickPhoto: "PICK A PHOTO",
    who: "Who are you?",
    nameLabel: "What should people call you?",
    namePlaceholder: "First name is enough",
    bioLabel: "A bit about you",
    bioPlaceholder: "What do you like doing on a free Saturday?",
    locating: "Finding your area …",
    areaUnknown: "Area unknown",
    areaPrivacy: "We only save roughly where you live, never your exact address.",
    interests: "What do you like?",
    interestsHelp: (min: number) => `Pick at least ${min}. They decide what you see.`,
    start: "Get started",
    saving: "Saving …",
    needPhoto: "Choose a photo of yourself first.",
    needName: "Write what you want to be called.",
    needInterests: (n: number) => `Pick ${n} more ${n === 1 ? "interest" : "interests"}.`,
    needAll: "Fill in all three steps first.",
    photoFailed: "Could not choose a photo",
    saveFailed: "Could not save",
  },

  feed: {
    title: "Nearby",
    yourArea: "Your area",
    post: "Post",
    soon: "Happening soon",
    planned: "Planned",
    emptyTitle: "Nothing here yet",
    emptyBody:
      "Nobody has posted anything nearby yet. Be the first, one is usually enough.",
    emptyFiltered: "No activities match the filter. Try removing one.",
    clearFilter: "Clear filter",
    create: "Post an activity",
  },

  card: {
    spontaneous: "Right now",
    friendsOnly: "Friends only",
    applied: "Applied",
    youreIn: "You are in",
    yours: "Yours",
    full: "Full",
    openToAll: "Open to everyone",
    joined: (n: number) => `${n} joined`,
    spotsLeft: (n: number) => (n === 1 ? "1 spot left" : `${n} spots left`),
    answer: "Reply",
    wantIn: (n: number) =>
      n === 1 ? "1 person wants to join" : `${n} people want to join`,
  },

  activity: {
    host: "Host",
    map: "Map",
    withSoFar: "Joining so far",
    spotsTaken: (taken: number, total: number) => `${taken} of ${total} spots taken`,
    noLimit: (n: number) => `${n} joined · no limit`,
    costsOnSite: (kr: number) => `Costs ${kr} kr on site`,
    apply: "I want to join",
    openChat: "Open the chat",
    edit: "Edit activity",
    cancel: "Call it off",
    cancelTitle: "Call this off?",
    cancelBody: "Everyone who joined will be told in the chat.",
    cancelConfirm: "Call it off",
    leave: "Leave",
    leaveTitle: "Leave this?",
    leaveBody: "You will be removed from the activity and its chat.",
    applicants: (n: number) => `Want to join (${n})`,
    applicantsHelp: "You choose. The others are only told the spots went.",
    acceptCreatesChat: "Accept someone and you land in a chat together right away.",
    allTaken: "All spots are taken. If someone leaves you can accept more.",
    accept: "Accept",
    decline: "No thanks",
    cancelledBadge: "Called off",
    pastBadge: "Already happened",
    repeat: "Do this again",
    withdraw: "Take back my request",
    hostCancelled: "The host called it off.",
    couldNotLoad: "Could not load the activity",
  },

  apply: {
    title: (activity: string) => `Join ${activity}`,
    why: "Write a line to the host. It is what makes you stand out from the others.",
    yourLine: "Your line",
    yourLinePlaceholder: "Why do you want to join?",
    tooShort: "Write something, it does not have to be long.",
    experience: "How used to this are you?",
    experienceHelp: "Optional. Helps the host plan, and being new is never a minus.",
    firstTime: "First time",
    some: "Done it before",
    often: "Do it often",
    payOnSite: "You each pay on site.",
    send: "Send",
    failed: "Could not join",
  },
};
