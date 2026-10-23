# App Store Connect — listing draft

Draft of everything App Store Connect asks for, ready to paste once the
Apple Developer account is active. This repo is public: **never put the
review account's password in this file** — type it straight into App Store
Connect.

Wording rule for every field: BoteGo is a **classified-ads board** where
people post and find rides, deliveries and hauling jobs in Florida. Never
describe it as booking, dispatching, hailing or providing transportation,
and never call prices fares (see the FL §627.748 / TNC boundary).

## App information

| Field | Value |
|---|---|
| Name | BoteGo |
| Subtitle (≤30) | Florida rides, deliveries & hauling |
| Primary category | Travel |
| Secondary category | Lifestyle |
| Bundle ID | com.botego.app |
| SKU | botego-ios |
| Privacy Policy URL | https://botego.app/privacy.html |
| Support URL | https://botego.app/support.html |
| Marketing URL | https://botego.app |
| Terms (EULA) | Apple standard EULA, plus https://botego.app/terms.html in the description |
| Copyright | © 2026 BoteGo |

## Promotional text (≤170)

Post a ride, a delivery or a hauling job anywhere in Florida and connect directly with people going your way. No dispatch, no surge pricing.

## Description — English

BoteGo is Florida's community board for rides, deliveries and hauling.

Post what you need — a ride to the airport, a package that has to cross town, a load of junk to haul away — or post what you're offering. People going your way see your post, send you a message or an offer, and you agree the details directly with each other. BoteGo doesn't dispatch drivers, set prices or take a cut of what you agree.

• Rides, packages and hauling jobs in one feed, anywhere in Florida
• Filters for route, date, vehicle type, accessibility, pets and more
• In-app messaging — no need to share your phone number
• Airport trips with live flight status
• Route intelligence: traffic, weather, nearby events and road work for your trip (Donor)
• Community badges and feedback so you know who you're dealing with
• Saved addresses and saved drivers for the people you trust
• Report and block tools to keep the community safe

Donor is an optional monthly subscription that unlocks extra features and supports the community board. It renews automatically until you cancel it in your App Store settings.

Terms of Service: https://botego.app/terms.html
Privacy Policy: https://botego.app/privacy.html

## Description — Spanish (Mexico / Spain localizations)

BoteGo es el tablero comunitario de Florida para viajes, envíos y acarreos.

Publica lo que necesitas — un viaje al aeropuerto, un paquete que debe cruzar la ciudad, una carga de escombros para retirar — o publica lo que ofreces. Quienes van en tu misma dirección ven tu publicación, te escriben o te hacen una oferta, y ustedes acuerdan los detalles directamente. BoteGo no asigna conductores, no fija precios ni cobra comisión sobre lo que acuerden.

• Viajes, paquetes y acarreos en un solo feed, en toda Florida
• Filtros por ruta, fecha, tipo de vehículo, accesibilidad, mascotas y más
• Mensajes dentro de la app, sin compartir tu teléfono
• Viajes al aeropuerto con estado del vuelo en vivo
• Inteligencia de ruta: tráfico, clima, eventos cercanos y obras viales (Donante)
• Insignias y comentarios de la comunidad para saber con quién tratas
• Direcciones y conductores guardados para la gente de confianza
• Herramientas para reportar y bloquear usuarios

Donante es una suscripción mensual opcional que desbloquea funciones extra. Se renueva automáticamente hasta que la canceles en los ajustes de la App Store.

## Keywords (≤100 chars, comma-separated, no spaces)

rideshare,carpool,florida,miami,orlando,delivery,hauling,courier,airport,moving,junk,tampa

## Age rating questionnaire

- User-generated content: **Yes** (posts and messages between users), with report + block available in-app.
- Unrestricted web access: No. Gambling, violence, mature themes: None.
- Expect **12+** (or 17+ if Apple maps open messaging to it) — answer honestly, don't optimize.

## App Privacy ("nutrition label")

Data **linked to the user**, none used for tracking, no third-party advertising:

| Data type | Collected | Purpose |
|---|---|---|
| Name | Yes | App functionality |
| Email address | Yes | App functionality, account |
| Phone number | Optional (profile) | App functionality |
| Precise location | Yes (while in use) | App functionality (nearby posts, weather) |
| Photos | Yes (profile, vehicle, hauling) | App functionality |
| User content — messages, posts, reviews | Yes | App functionality |
| Purchases | Yes (Donor) | App functionality |
| User ID | Yes | App functionality |
| Device ID (push token) | Yes | App functionality (notifications) |

Tracking (ATT): **No** — no data is shared with data brokers or used for ads.

## In-app purchase

- Type: auto-renewable subscription, group "Donor".
- Products: monthly Donor tiers matching Android ($10 / $20 / $50).
- Present it as a **subscription that unlocks features**, not as a donation —
  Apple only allows real donations for registered nonprofits (guideline 3.2.2).
- Restore Purchases is already in the app.

## App Review information

- Sign-in: `demo@botego.app` — password entered only in App Store Connect.
- The demo account must have a few sample posts before submitting, and nobody
  should sign in with it during review (the app allows one active session per
  account, so a second sign-in would log the reviewer out).
- Notes for the reviewer:

  > BoteGo is a community classifieds board for Florida. Users post ride,
  > delivery and hauling requests or offers and contact each other through
  > in-app messages; BoteGo does not dispatch drivers, set prices or process
  > payments between users. Jobs must take place in Florida, so addresses
  > outside Florida are not accepted. Account deletion: Profile → Edit →
  > Delete my account. The Donor subscription is the only purchase and is
  > sold through In-App Purchase.

## Screenshots still needed

6.9" iPhone (1320×2868), at least 3, ideally: feed, post detail with route
intelligence, create-post form, messages, profile/dashboard. Can be taken
from the iOS simulator build or TestFlight once the account exists.
