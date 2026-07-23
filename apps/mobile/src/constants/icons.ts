import { MaterialCommunityIcons } from "@expo/vector-icons";
import type React from "react";

export const Icons = {
  // Tab bar
  tabHome: "home-outline",
  tabWork: "briefcase-outline",
  tabChat: "chat-outline",
  tabPerson: "account-outline",
  tabBrowse: "magnify",
  tabBids: "gavel",

  // Navigation
  back: "arrow-left",
  chevronRight: "chevron-right",
  close: "close",
  menu: "menu",

  // Actions
  add: "plus",
  location: "map-marker-outline",
  camera: "camera-outline",
  edit: "pencil-outline",
  delete: "delete-outline",
  share: "share-outline",
  check: "check",

  // Urgency
  emergency: "lightning-bolt",
  today: "clock-outline",
  scheduled: "calendar-today",

  // Credits / finance
  credit: "ticket-outline",

  // Roles
  handyman: "hammer-wrench",
  homeRepair: "toolbox-outline",

  // Categories
  category: "shape-outline",

  // Trust / verification
  verified: "check-decagram",
  star: "star-outline",
  thumbUp: "thumb-up-outline",
  noShow: "cancel",

  // Empty states
  notifNone: "bell-outline",
  workOutline: "briefcase-outline",
  history: "history",
  hourglass: "timer-sand-outline",
  chatNone: "chat-outline",
  searchOff: "magnify-remove-outline",
  assignment: "clipboard-text-outline",
  gavel: "gavel",

  // Media
  video: "video-outline",
  play: "play-circle-outline",
  image: "image-outline",
  addPhoto: "image-plus",

  // Misc
  chevronDown: "chevron-down",
  checkCircle: "check-circle-outline",
  warning: "alert-outline",
  info: "information-outline",
  phone: "phone-outline",
  notifs: "bell-outline",
  notifsActive: "bell-ring-outline",
  language: "web",
  help: "help-circle-outline",
  about: "information-outline",
  logout: "logout",
  visibility: "eye-outline",
  visibilityOff: "eye-off-outline",

  // Notification type icons
  undo: "undo",
  assignmentTurnedIn: "clipboard-check-outline",
  taskAlt: "check-circle-outline",
  gppBad: "shield-remove-outline",
  reportProblem: "alert-circle-outline",
  handshake: "handshake-outline",
} as const;

export type IconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"];
