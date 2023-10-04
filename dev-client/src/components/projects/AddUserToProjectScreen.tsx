import {ScrollView} from 'native-base';
import {FreeformTextInput} from '../common/FreeformTextInput';
import {useTranslation} from 'react-i18next';
import {ScreenScaffold} from '../../screens/ScreenScaffold';

type Props = {
  projectId: string;
};

export const AddUserToProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();
  return (
    <ScreenScaffold>
      <ScrollView>
        <FreeformTextInput
          validationFunc={value => Promise.resolve('Example error message')}
          placeholder={t('general.example_email')}
        />
      </ScrollView>
    </ScreenScaffold>
  );
};
