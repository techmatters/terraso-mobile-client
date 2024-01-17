import {Column, Heading, Row} from 'native-base';
import {
  DepthDependentSoilData,
  LabelledDepthInterval,
  SoilDataDepthInterval,
  soilPitMethods,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {IconButton} from 'terraso-mobile-client/components/Icons';
import {EditIntervalModalContent} from './EditIntervalModalContent';
import {BottomSheetModal} from 'terraso-mobile-client/components/BottomSheetModal';
import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {useTranslation} from 'react-i18next';

const DepthIntervalEditor = ({
  siteId,
  interval: {label, depthInterval},
  requiredInputs,
}: {
  siteId: string;
  interval: LabelledDepthInterval;
  requiredInputs: (typeof soilPitMethods)[number][];
}) => {
  return (
    <Row
      backgroundColor="primary.dark"
      justifyContent="space-between"
      px="12px"
      py="8px">
      <Heading variant="h6" color="primary.contrast">
        {label && `${label}: `}
        {`${depthInterval.start}-${depthInterval.end} cm`}
      </Heading>
      <BottomSheetModal
        trigger={onOpen => (
          <IconButton
            name="more-vert"
            _icon={{color: 'primary.contrast'}}
            onPress={onOpen}
          />
        )}>
        <EditIntervalModalContent
          siteId={siteId}
          depthInterval={depthInterval}
          requiredInputs={requiredInputs}
        />
      </BottomSheetModal>
    </Row>
  );
};

type Props = {
  siteId: string;
  requiredInputs: (typeof soilPitMethods)[number][];
  interval: SoilDataDepthInterval;
  data: DepthDependentSoilData | undefined;
};

export const SoilDepthIntervalSummary = ({
  siteId,
  interval,
  requiredInputs,
  data,
}: Props) => {
  const inputs: (keyof DepthDependentSoilData)[] = [
    'texture',
    'rockFragmentVolume',
    'colorValue',
  ];

  const {t} = useTranslation();

  return (
    <Column>
      <DepthIntervalEditor
        siteId={siteId}
        interval={interval}
        requiredInputs={requiredInputs}
      />
      {inputs.map(key => (
        <DataInputSummary
          key={key}
          required={false}
          complete={data ? data[key] !== undefined : false}
          label={t(`soil.data.${key}`)}
          onPress={() => {}}
        />
      ))}
    </Column>
  );
};
