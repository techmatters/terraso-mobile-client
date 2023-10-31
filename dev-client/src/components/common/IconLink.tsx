import {Link} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  children?: React.ReactNode;
  iconName: string;
  underlined?: boolean;
} & React.ComponentProps<typeof Link>;

// TODO: There is going to be (at least) two different types of IconLinks
// Let's use this one for now
export default function IconLink({
  children,
  iconName,
  underlined,
  onPress,
  ...props
}: Props) {
  return (
    <Link
      _text={{color: 'primary.main', fontSize: 'xs'}}
      alignItems="center"
      alignContent="flex-start"
      isUnderlined={underlined}
      {...props}>
      <Icon name={iconName} color="primary.main" size="md" mr={3} />
      {children}
    </Link>
  );
}
