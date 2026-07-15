// Icon set — Lucide (lucide-react-native), per the RideMate Design System.
// Semantic name -> Lucide component. Lucide is a single (stroke) style, so
// MDI's filled/outline pairs (star/star_outline, person/person_outline, ...)
// collapse onto the same Lucide icon here — kept as separate keys only so
// existing call sites don't need to change.
import {
  Home, Compass, MessageCircle, Plus, User,
  Car, Truck, Users,
  Map, MapPin, Route, Navigation,
  Phone, Mail, MessageCircle as WhatsApp, // ⚠ no WhatsApp brand glyph in Lucide — placeholder, revisit
  Star, Check, CheckCircle2, ShieldCheck, Handshake, X, Pencil, Trash2, Send,
  Globe, Lock,
  Clock, Calendar, Armchair, DollarSign,
  TriangleAlert, Info, Flag, Shield, Award,
  Settings, History, Camera, LogOut, Key, FileText,
  ArrowLeft, ArrowRight, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Share2, Copy, ListFilter, Search, MoreVertical, Bell, BadgeCheck,
  Eye, EyeOff, AtSign, UserPlus, LogIn,
  // vehicle amenities
  Zap, Flame, Baby, Bluetooth, Wifi,
  Cigarette, CigaretteOff,
  Leaf, // ⚠ standing in for cannabis_ok/cannabis_free — no cannabis-specific glyph in Lucide, revisit
  Martini, UtensilsCrossed,
  VolumeX, Music, Snowflake, PartyPopper,
  Droplets, // ⚠ standing in for hand_wash — no hygiene-specific glyph, revisit
  Video, Accessibility, PawPrint,
  // fuel types
  Fuel, Plug, Droplet, Repeat,
  // weather
  Sun, Cloud, CloudRain,
  // feed layout controls
  SlidersHorizontal, AlignJustify, LayoutGrid,
  // saved-address icon picker
  MapPinHouse, BriefcaseBusiness, Plane, TrainFront, MapPinCheck,
  Church, School, Factory, Store, TreePine,
  PencilLine,
} from 'lucide-react-native';

export const icons = {
  // ── Navigation / Tab bar ─────────────────────────────────────────────
  home: Home,
  compass: Compass,
  chat: MessageCircle,
  chat_outline: MessageCircle,
  add: Plus,
  person: User,
  person_outline: User,

  // ── Ride types ────────────────────────────────────────────────────────
  car: Car,
  truck: Truck,
  passenger: Users,

  // ── Map / Route ────────────────────────────────────────────────────────
  map: Map,
  location: MapPin,
  route: Route,
  navigation: Navigation,

  // ── Contact methods ───────────────────────────────────────────────────
  phone: Phone,
  email: Mail,
  whatsapp: WhatsApp,

  // ── Actions ───────────────────────────────────────────────────────────
  star: Star,
  star_outline: Star,
  check: Check,
  check_circle: CheckCircle2,
  shield_check: ShieldCheck,
  handshake: Handshake,
  close: X,
  edit: Pencil,
  delete: Trash2,
  send: Send,

  // ── Visibility ────────────────────────────────────────────────────────
  globe: Globe,
  lock: Lock,

  // ── Schedule / Details ────────────────────────────────────────────────
  schedule: Clock,
  event: Calendar,
  seat: Armchair,
  money: DollarSign,

  // ── Status / Feedback ─────────────────────────────────────────────────
  warning: TriangleAlert,
  info: Info,
  report: Flag,
  shield: Shield,
  badge: Award,

  // ── Profile / Settings ────────────────────────────────────────────────
  settings: Settings,
  history: History,
  camera: Camera,
  logout: LogOut,
  key: Key,
  pageinfo: FileText,

  // ── Navigation arrows ────────────────────────────────────────────────
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,
  chevron_down: ChevronDown,
  chevron_up: ChevronUp,
  expand_more: ChevronDown,
  expand_less: ChevronUp,

  // ── Misc ──────────────────────────────────────────────────────────────
  share: Share2,
  copy: Copy,
  filter: ListFilter,
  search: Search,
  dots_vertical: MoreVertical,
  notification: Bell,
  verified: BadgeCheck,
  eye: Eye,
  eye_off: EyeOff,
  at_sign: AtSign,
  user_plus: UserPlus,
  log_in: LogIn,

  // ── Vehicles — amenity icons (one name = one icon = one VehicleAmenity key) ──
  ev_station: Zap,
  seat_recline: Armchair,
  seat_heater: Flame,
  baby_seat: Baby,
  bluetooth: Bluetooth,
  wifi: Wifi,
  smoking: Cigarette,
  smoke_free: CigaretteOff,
  vape_free: CigaretteOff,      // ⚠ same glyph as smoke_free — no distinct vape icon, revisit
  cannabis_ok: Leaf,            // ⚠ approximation, revisit
  cannabis_free: Leaf,          // ⚠ same glyph as cannabis_ok — no "off" variant, revisit
  glass_cocktail: Martini,
  food_off: UtensilsCrossed,
  quiet_ride: VolumeX,
  music_ok: Music,
  ac_unit: Snowflake,
  celebration: PartyPopper,
  hand_wash: Droplets,          // ⚠ approximation, revisit
  dashcam: Video,
  accessible: Accessibility,
  pets_ok: PawPrint,
  no_pets: PawPrint,            // ⚠ same glyph as pets_ok — no "off" variant, revisit

  // ── Fuel types ────────────────────────────────────────────────────────
  fuel: Fuel,
  bolt: Zap,
  eco: Leaf,
  power_plug: Plug,
  water_drop: Droplet,
  oil_barrel: Fuel,             // ⚠ no barrel glyph, reused fuel icon, revisit
  loop: Repeat,
  hybrid: Leaf,                 // ⚠ was a car+leaf composite, no single Lucide equivalent, revisit

  // ── Weather (home header) ───────────────────────────────────────────────
  weather_sun: Sun,
  weather_cloud: Cloud,
  weather_rain: CloudRain,
  weather_snow: Snowflake,
  weather_storm: Zap,

  // ── Feed layout controls ─────────────────────────────────────────────────
  sliders: SlidersHorizontal,
  layout_list: AlignJustify,
  layout_grid: LayoutGrid,

  // ── Saved-address icon picker (10 options) ───────────────────────────────
  addr_home: MapPinHouse,
  addr_work: BriefcaseBusiness,
  addr_airport: Plane,
  addr_station: TrainFront,
  addr_general: MapPinCheck,
  addr_church: Church,
  addr_school: School,
  addr_factory: Factory,
  addr_store: Store,
  addr_park: TreePine,
  pencil_line: PencilLine,
} as const;

export type IconName = keyof typeof icons;
