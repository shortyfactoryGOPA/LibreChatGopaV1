import { useRecoilValue } from 'recoil';
import { OpenSidebar } from '~/components/Chat/Menus';
import store from '~/store';

export default function SidebarReopenButton() {
  const sidebarExpanded = useRecoilValue(store.sidebarExpanded);

  if (sidebarExpanded) {
    return null;
  }

  return (
    <div className="sticky top-0 z-20 mb-4 hidden md:flex">
      <div className="via-presentation/95 w-fit rounded-2xl bg-gradient-to-b from-presentation to-transparent pb-2">
        <OpenSidebar />
      </div>
    </div>
  );
}
