import NetInfo from '@react-native-community/netinfo';
import { EVENTS } from 'notes-core/common';
import { editorController } from '../screens/editor/tiptap/utils';
import { initialize } from '../stores';
import { useUserStore } from '../stores/use-user-store';
import { doInBackground } from '../utils';
import { db } from '../utils/database';
import { ToastEvent } from './event-manager';

export const ignoredMessages = [
  'Sync already running',
  'Not allowed to start service intent',
  'WebSocket failed to connect'
];

const run = async (context = 'global', forced = false, full = true) => {
  let result = false;
  const userstore = useUserStore.getState();
  const user = await db.user.getUser();
  if (!user) {
    initialize();
    return true;
  }
  userstore.setSyncing(true);
  let error = null;
  console.log('Sync.run started');
  try {
    console.log('DO IN BACKGROUND START');
    let res = await doInBackground(async () => {
      try {
        console.log('DO IN BACKGROUND');
        await db.sync(full, forced);
        return true;
      } catch (e) {
        error = e;
        return e.message;
      }
    });
    if (!res) {
      initialize();
      return false;
    }
    if (typeof res === 'string') throw error;

    userstore.setSyncing(false);
    result = true;
  } catch (e) {
    result = false;
    if (!ignoredMessages.find(im => e.message?.includes(im)) && userstore.user) {
      userstore.setSyncing(false);
      let status = await NetInfo.fetch();
      if (status.isConnected && status.isInternetReachable) {
        ToastEvent.error(e, 'Sync failed', context);
      }
    }
  } finally {
    if (full || forced) {
      db.eventManager.publish(EVENTS.syncCompleted);
    }
    console.log('sync done');
  }
  return result;
};

const Sync = {
  run
};

export default Sync;
