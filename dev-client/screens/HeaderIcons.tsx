import MaterialIconButton from '../components/common/MaterialIconButton';

export function MainMenuBar() {
  return (
    <MaterialIconButton name="menu" iconProps={{color: 'primary.contrast'}} />
  );
}

export function MapInfoIcon() {
  return (
    <MaterialIconButton name="info" iconProps={{color: 'primary.contrast'}} />
  );
}
