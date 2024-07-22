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

import {useTranslation} from 'react-i18next';

import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalTrigger} from 'terraso-mobile-client/components/modals/Modal';

type ConfirmDeleteDepthModalProps = {
  onConfirm: () => void;
  trigger: ModalTrigger;
};

export const ConfirmDeleteDepthModal = ({
  onConfirm,
  trigger,
}: ConfirmDeleteDepthModalProps) => {
  const {t} = useTranslation();

  return (
    <ConfirmModal
      trigger={trigger}
      title={t('soil.depth.delete_modal.title')}
      body={t('soil.depth.delete_modal.body')}
      actionName={t('soil.depth.delete_modal.action')}
      handleConfirm={onConfirm}
    />
  );
};
