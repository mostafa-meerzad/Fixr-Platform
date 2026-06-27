export const Icons = {
  // Tab bar
  tabHome:      'home',
  tabWork:      'work',
  tabChat:      'chat_bubble',
  tabPerson:    'person',
  tabBrowse:    'search',
  tabBids:      'gavel',

  // Navigation
  back:         'arrow_back',
  chevronRight: 'chevron_right',
  close:        'close',
  menu:         'menu',

  // Actions
  add:          'add',
  location:     'location_on',
  camera:       'photo_camera',
  edit:         'edit',
  delete:       'delete',
  share:        'share',

  // Urgency
  emergency:    'flash_on',
  today:        'schedule',
  scheduled:    'calendar_today',

  // Credits / finance
  credit:       'toll',

  // Roles
  handyman:     'handyman',
  homeRepair:   'home_repair_service',

  // Trust / verification
  verified:     'verified',
  star:         'star',
  thumbUp:      'thumb_up',
  noShow:       'cancel',

  // Empty states
  notifNone:    'notifications_none',
  workOutline:  'work_outline',
  history:      'history',
  hourglass:    'hourglass_empty',
  chatNone:     'chat_bubble_outline',
  searchOff:    'search_off',
  assignment:   'assignment',
  gavel:        'gavel',

  // Media
  video:        'videocam',
  play:         'play_circle',
  image:        'image',

  // Misc
  checkCircle:  'check_circle',
  warning:      'warning',
  info:         'info',
  phone:        'phone',
  notifs:       'notifications',
  language:     'language',
  help:         'help_outline',
  about:        'info_outline',
  logout:       'logout',
  visibility:   'visibility',
  visibilityOff:'visibility_off',
} as const;

export type IconName = (typeof Icons)[keyof typeof Icons];
