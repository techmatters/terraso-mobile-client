/*
 * Copyright © 2024 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {createContext, useContext, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {ErrorDialog} from 'terraso-mobile-client/components/dialogs/ErrorDialog';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';

export type SyncNotificationHandle = {
  showError: () => void;
};

const SyncNotificationContext = createContext<SyncNotificationHandle>({
  showError: () => {},
});

export const useSyncNotificationContext = () => {
  return useContext(SyncNotificationContext);
};

export const SyncNotificationContextProvider = ({
  children,
}: React.PropsWithChildren) => {
  const {t} = useTranslation();
  const errorDialogRef = useRef<ModalHandle>(null);
  const syncNotificationHandle = useMemo(() => {
    return {
      showError: () => errorDialogRef.current?.onOpen(),
    };
  }, [errorDialogRef]);

  return (
    <SyncNotificationContext.Provider value={syncNotificationHandle}>
      <ErrorDialog
        ref={errorDialogRef}
        supportUrl={t('errors.sync_conflict.support_url')}
        headline={
          <TranslatedHeading i18nKey="errors.sync_conflict.headline" />
        }>
        <TranslatedParagraph i18nKey="errors.sync_conflict.body" />
      </ErrorDialog>
      {children}
    </SyncNotificationContext.Provider>
  );
};
