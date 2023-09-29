import {Box, Button, Column, Heading, Row, useDisclose} from 'native-base';
import {useSelector} from '../../model/store';
import {useTranslation} from 'react-i18next';
import {Icon, IconButton} from '../common/Icons';
import {AddIntervalModal} from './AddIntervalModal';

export const SoilScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const {
    isOpen: addIntervalIsOpen,
    onOpen: addIntervalOnOpen,
    onClose: addIntervalOnClose,
  } = useDisclose();
  const soilData = useSelector(state => state.soilId.soilData[siteId]);

  return (
    <>
      <AddIntervalModal
        siteId={siteId}
        isOpen={addIntervalIsOpen}
        onClose={addIntervalOnClose}
      />
      <Column backgroundColor="grey.300">
        <Row backgroundColor="background.default">
          <Heading variant="h6">{t('soil.profile')}</Heading>
        </Row>
        <Box height="16px" />
        {soilData.depthIntervals.map(interval => (
          <Row
            backgroundColor="primary.dark"
            justifyContent="space-between"
            px="12px"
            py="8px">
            <Heading variant="h6">{`${interval.start}-${interval.end} cm`}</Heading>
            <IconButton name="more-vert" />
          </Row>
        ))}
        <Button
          variant="large"
          color="primary.dark"
          width="full"
          leftIcon={<Icon name="add" />}
          onPress={addIntervalOnOpen}>
          {t('soil.add_depth_label')}
        </Button>
      </Column>
    </>
  );
};
