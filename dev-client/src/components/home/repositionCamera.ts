import {CameraRef} from '@rnmapbox/maps/lib/typescript/components/Camera';

export const repositionCamera = (
  feature: GeoJSON.Feature,
  zoomLevel: number,
  animationDuration: number,
  paddingBottom: number,
  cameraRef?: React.RefObject<CameraRef>,
) => {
  if (!feature.geometry || feature.geometry.type !== 'Point') {
    console.error(
      'Feature has no geometry or non-Point geometry',
      feature.geometry,
    );
    return;
  }
  const padding = {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: paddingBottom,
  };

  cameraRef?.current?.setCamera({
    zoomLevel,
    centerCoordinate: feature.geometry.coordinates,
    animationDuration,
    animationMode: 'easeTo',
    padding,
  });
};
