import {Button, HStack, Heading, Modal, Text, useDisclose} from 'native-base';
import {ModalTrigger} from './Modal';
import {useTranslation} from 'react-i18next';
import {useCallback} from 'react';

type Props = {
  trigger: ModalTrigger;
  title: string;
  body: string;
  actionName: string;
  handleConfirm: () => void;
};

/**
 * Modal presented to a user when asked to confirm a decision
 */
const ConfirmModal = ({
  title,
  body,
  actionName,
  handleConfirm,
  trigger,
}: Props) => {
  const {isOpen, onOpen, onClose} = useDisclose();
  const {t} = useTranslation();
  const onConfirm = useCallback(() => {
    handleConfirm();
    onClose();
  }, [handleConfirm]);
  return (
    <>
      {trigger(onOpen)}
      <Modal isOpen={isOpen}>
        <Modal.Content backgroundColor="grey.200">
          <Modal.Body>
            <Heading variant="h5" mb="16px" textAlign="center">
              {title}
            </Heading>
            <Text mb="16px">{body}</Text>
          </Modal.Body>
          <Modal.Footer backgroundColor="grey.200">
            <HStack space="8px" alignItems="center">
              <Button
                onPress={onClose}
                variant="confirmModal"
                _text={{
                  color: 'text.primary',
                  fontWeight: '400',
                  fontSize: '14px',
                }}
                borderWidth="1px"
                borderColor="m3.sys.light.outline">
                {t('general.cancel')}
              </Button>
              <Button
                onPress={onConfirm}
                variant="confirmModal"
                backgroundColor="error.main"
                _text={{
                  color: 'error.contrast',
                  fontWeight: '400',
                  fontSize: '14px',
                }}>
                {actionName}
              </Button>
            </HStack>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
};

export default ConfirmModal;
