import {Box, Row, Text} from 'native-base';
import {Pressable} from 'react-native';
import {Icon} from 'terraso-mobile-client/components/Icons';

type Props = {
  required: boolean;
  complete: boolean;
  label: string;
  value?: string;
  onPress: () => void;
};
export const DataInputSummary = ({
  required,
  complete,
  label,
  value,
  onPress,
}: Props) => (
  <Pressable onPress={onPress}>
    <Row
      backgroundColor={complete ? 'primary.lightest' : 'primary.contrast'}
      p="15px">
      <Box width="37px">
        {(complete || required) && (
          <Icon
            color={complete ? 'primary.dark' : undefined}
            name={
              complete && required
                ? 'check-circle'
                : complete
                  ? 'check'
                  : 'radio-button-unchecked'
            }
          />
        )}
      </Box>
      <Text variant="body1" fontWeight={700}>
        {label}
      </Text>
      <Box flex={1} />
      <Text variant="body1">{value}</Text>
    </Row>
  </Pressable>
);
