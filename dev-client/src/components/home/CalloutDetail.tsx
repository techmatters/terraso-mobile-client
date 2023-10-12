import {Box, Text} from 'native-base';

export const CalloutDetail = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <Box>
      <Text>{label}</Text>
      <Text bold>{value}</Text>
    </Box>
  );
};
