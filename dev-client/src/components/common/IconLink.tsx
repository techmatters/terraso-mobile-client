import {Link} from 'native-base';
import {Icon} from './Icons';

type Props = {
  children?: React.ReactNode;
  href?: string;
  iconName: string;
  underlined?: boolean;
  onPress?: () => void;
};

// TODO: There is going to be (at least) two different types of IconLinks
// Let's use this one for now
export default function IconLink({
  children,
  href,
  iconName,
  underlined,
  onPress,
}: Props) {
  return (
    <Link
      _text={{color: 'primary.main', fontSize: 'xs'}}
      alignItems="center"
      alignContent="flex-start"
      href={href}
      isUnderlined={underlined}
      onPress={onPress}>
      <Icon name={iconName} color="primary.main" size="md" mr={3} />
      {children}
    </Link>
  );
}
