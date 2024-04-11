import {Trans, useTranslation} from 'react-i18next';
import {
  Paragraph,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const SlopeMeterInfoContent = () => {
  const {t} = useTranslation();

  return (
    <>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description1')}
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description2')}
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description3')}
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description4')}
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description5')}
      </Paragraph>
      <Paragraph variant="body1">
        <Trans i18nKey="slope.steepness.info.description6">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Paragraph>
    </>
  );
};
