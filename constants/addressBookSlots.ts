import { IconName } from '@/constants/icons';
import { useTranslation } from '@/hooks/useTranslation';

export interface AddressBookSlotDef {
  id: string;
  label: string;
  icon: IconName;
}

// The 5 fixed Address Book slots (home/work/3 general) — shared by the
// profile Address Book screen and every post form's SmartAddressField, both
// of which now read/write the same supabase.saved_addresses rows (see
// hooks/useSavedAddresses.ts) instead of keeping their own disconnected
// session-local copies.
export function addressBookSlots(t: ReturnType<typeof useTranslation>): AddressBookSlotDef[] {
  return [
    { id: 'home', label: t.profile.addressHome, icon: 'addr_home' },
    { id: 'work', label: t.profile.addressWork, icon: 'addr_work' },
    { id: 'addr1', label: `${t.profile.addressSlot} 1`, icon: 'addr_general' },
    { id: 'addr2', label: `${t.profile.addressSlot} 2`, icon: 'addr_general' },
    { id: 'addr3', label: `${t.profile.addressSlot} 3`, icon: 'addr_general' },
  ];
}
