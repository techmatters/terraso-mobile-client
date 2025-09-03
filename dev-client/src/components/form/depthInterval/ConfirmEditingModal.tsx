/*
 * Copyright © 2025 Technology Matters
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

import {FormEvent, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {DepthInterval} from 'terraso-mobile-client/model/soilData/soilDataSlice';

type ModalProps = {
  formNotReady: boolean;
  handleSubmit: (e?: FormEvent<HTMLFormElement> | undefined) => void;
  interval: DepthInterval;
};

/**
 * Shows a modal warning if there have been changes to the interval start
 * or end.
 */
export const ConfirmEditingModal = ({
  formNotReady,
  handleSubmit,
  interval: {start, end},
}: ModalProps) => {
  const {t} = useTranslation();

  const newStart = useFieldContext('start');
  const newEnd = useFieldContext('end');

  const showWarningModal = useMemo(() => {
    return Number(newStart.value) !== start || Number(newEnd.value) !== end;
  }, [start, end, newStart, newEnd]);

  const buttonAction = useMemo(
    () =>
      (onOpen: () => void) =>
      (...args: Parameters<typeof handleSubmit>) =>
        showWarningModal ? onOpen() : handleSubmit(...args),
    [handleSubmit, showWarningModal],
  );

  return (
    <ConfirmModal
      trigger={onOpen => (
        <ContainedButton
          size="lg"
          onPress={buttonAction(onOpen)}
          disabled={formNotReady}
          label={t('general.save')}
        />
      )}
      title={t('soil.depth.update_modal.title')}
      body={t('soil.depth.update_modal.body')}
      actionLabel={t('soil.depth.update_modal.action')}
      handleConfirm={() => handleSubmit()}
    />
  );
};
