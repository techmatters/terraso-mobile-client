/*
 * Copyright © 2026 Technology Matters
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

import {useCallback, useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {
  Modal,
  ModalHandle,
} from 'terraso-mobile-client/components/modals/Modal';
import {
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  /** Email of the just-deleted account. Mount the dialog iff this is set;
   * the dialog opens itself and calls `onDismiss` after the close animation. */
  email: string;
  /** Called after the modal's close animation finishes. Parent should clear
   * the email so the dialog unmounts and doesn't re-appear on re-render. */
  onDismiss: () => void;
};

/**
 * Shown on the login screen right after a clean self-delete (no blockers).
 * Only mounted while there's an email to show (parent gates on that), so
 * it can just open on mount and dismiss via Modal's post-close hook.
 */
export function AccountDeletedDialog({email, onDismiss}: Props) {
  const {t} = useTranslation();
  const ref = useRef<ModalHandle>(null);
  // Modal fires `closeHook` on every `isOpen === false`, including the
  // initial mount render before our onOpen runs. Guard so `onDismiss`
  // only fires after the modal has actually opened.
  const hasOpened = useRef(false);

  useEffect(() => {
    ref.current?.onOpen();
    hasOpened.current = true;
  }, []);

  const handleAfterClose = useCallback(() => {
    if (hasOpened.current) onDismiss();
  }, [onDismiss]);

  return (
    <Modal
      ref={ref}
      closeHook={handleAfterClose}
      Header={<Heading variant="h5">{t('account_deleted.title')}</Heading>}
      Closer={null}>
      <Column space="24px">
        <Text variant="body1" alignSelf="flex-start">
          {t('account_deleted.body', {email})}
        </Text>
        <Row space="8px" alignSelf="flex-end" alignItems="center">
          <ExternalLink
            label={t('general.support')}
            url={t('general.help.url')}
          />
          <DialogButton
            label={t('general.dismiss')}
            type="outlined"
            onPress={() => ref.current?.onClose()}
          />
        </Row>
      </Column>
    </Modal>
  );
}
