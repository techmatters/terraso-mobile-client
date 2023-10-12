import {useCallback} from 'react';
import {Pressable} from 'react-native';
import {Column, Heading, Text} from 'native-base';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {CalloutState} from '../../screens/HomeScreen';
import {useSelector} from '../../model/store';

type SiteClusterCalloutListItemProps = {
  site: Site;
  setState: (state: CalloutState) => void;
};

const SiteClusterCalloutListItem = ({
  site,
  setState,
}: SiteClusterCalloutListItemProps) => {
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );
  const onPress = useCallback(() => {
    setState({kind: 'site', siteId: site.id});
  }, [site.id, setState]);

  return (
    <Pressable onPress={onPress}>
      <Column>
        <Heading variant="h6" color="primary.main">
          {site.name}
        </Heading>
        {project && <Text variant="body1">{project.name}</Text>}
      </Column>
    </Pressable>
  );
};

export default SiteClusterCalloutListItem;
