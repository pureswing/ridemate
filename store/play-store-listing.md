# Google Play Console — listing draft

Everything Play Console asks for, ready to paste once the developer
account exists. Same wording rule as the App Store draft
(store/app-store-listing.md): BoteGo is a classifieds board — never
"book", "dispatch", "hail" or "fares" (FL §627.748 / TNC boundary). This
repo is public: never put the review account's password here.

## Store settings

| Field | Value |
|---|---|
| App name (≤30) | BoteGo |
| Package | com.botego.app |
| App or game | App |
| Free or paid | Free (Donor is an in-app subscription) |
| Category | Travel & Local |
| Tags | Ride sharing, Carpooling, Delivery |
| Contact email | support@botego.app |
| Website | https://botego.app |
| Privacy policy | https://botego.app/privacy.html |
| Account deletion URL | https://botego.app/delete-account.html |

## Graphics

| Asset | File |
|---|---|
| App icon 512×512 (32-bit PNG) | store/graphics/play-icon-512.png |
| Feature graphic 1024×500 | store/graphics/play-feature-1024x500.png (source: play-feature.html) |
| Phone screenshots (2–8, 9:16) | Still needed — take on the Armor from the production build |

## Short description (≤80)

EN: Post and find rides, deliveries & hauling jobs across Florida — peer to peer.
ES: Publica y encuentra viajes, envíos y acarreos en toda Florida, entre personas.

## Full description

Use the English and Spanish descriptions from store/app-store-listing.md,
replacing the last paragraph with:

> Donor is an optional monthly subscription that unlocks extra features. It
> renews automatically until you cancel it in Google Play → Payments &
> subscriptions.

Add Spanish (es-419 and es-US) as translations of the listing.

## App content declarations

- **Ads:** No ads.
- **App access:** Restricted — provide `demo@botego.app` and its password in
  Play Console only. Note: one active session per account; don't sign in
  with it while a review is pending.
- **Target audience:** 18 and over only. The app connects adults to share
  rides with strangers; don't include minors.
- **Content rating (IARC):** Category "Social / Communication" style answers
  — users can interact and exchange messages: **Yes**; user-generated content:
  **Yes** (with report and block); shares the user's current location with
  other users: **No** (posts show addresses the user chose, not live
  location); digital purchases: **Yes**. No violence, sexuality, gambling or
  controlled substances.
- **News app / COVID / Government / Health / Financial features:** No.

## Data safety form

- Encrypted in transit: **Yes**. Users can request deletion: **Yes** (in-app
  and https://botego.app/delete-account.html).
- Data **shared** with third parties: **None** — Supabase, Google Maps,
  OpenAI, RevenueCat, Resend and Expo/Firebase act as service providers on
  BoteGo's behalf, which Play does not count as sharing.
- Data **collected** (all for App functionality; account management where
  noted; none optional unless marked):

| Data type | Notes |
|---|---|
| Location → Approximate + Precise | Nearby posts and local weather |
| Personal info → Name | Display name; legal name optional |
| Personal info → Email address | Account, account management |
| Personal info → Phone number | Optional (profile) |
| Personal info → User IDs | Account |
| Financial info → Purchase history | Donor subscription status |
| Messages → Other in-app messages | Chat between users |
| Photos and videos → Photos | Profile, vehicle and hauling photos |
| App activity → Other user-generated content | Posts, reviews, badges |
| Device or other IDs | Push notification token |

Not collected: contacts, calendar, health, files, audio, web browsing,
crash logs.

## In-app products

- Subscription "Donor", monthly base plans matching the app: $10 / $20 / $50.
- After creating them: link Play to RevenueCat (Google service account
  credentials) and replace the Android RevenueCat key in EAS env — it is
  still the RevenueCat **Test Store** key (`test_…`), which can't charge.

## Closed testing (personal accounts: 12 testers × 14 days)

1. Create a Google Group (e.g. botego-testers@googlegroups.com) or an email
   list in Play Console → Testing → Closed testing → Testers. Each tester
   must be added with the **Google account they use in the Play Store**.
2. Upload the production AAB to the closed track
   (`eas build -p android --profile production`, then `eas submit -p android`).
3. Share the opt-in link Play Console gives you
   (https://play.google.com/apps/testing/com.botego.app). Each tester opens
   it, taps **Become a tester**, then installs BoteGo **from the Play Store**.
4. Testers who already have the APK from botego.app must **uninstall it
   first** — the Play build is signed with a different key, so Android won't
   install it over the APK. Their BoteGo account and data are on the server
   and survive the reinstall.
5. Keep at least 12 testers opted in for 14 consecutive days (recruit ~15
   as a buffer), then apply for production access in Play Console. Google
   asks about the test and the feedback received, so real use matters.

## Handling deletion requests by email

The delete-account page offers an email path for people without the app.
When one arrives at support@botego.app from the account's email address,
delete the user in Supabase Dashboard → Authentication → Users (every table
cascades) and remove their `<userId>/` folders in the avatars,
vehicle-photos, hauling-photos and route-maps buckets, then reply to confirm.
