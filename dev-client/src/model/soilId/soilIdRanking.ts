import {
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilIdResults} from 'terraso-client-shared/soilId/soilIdTypes';

export const getTopMatch = (
  results: SoilIdResults,
): LocationBasedSoilMatch | DataBasedSoilMatch | undefined => {
  const locationBased = results.locationBasedMatches;
  const dataBased = results.dataBasedMatches;

  if (dataBased.length > 0) {
    return dataBased.reduce(
      (prev, current) =>
        current.combinedMatch.rank > prev.combinedMatch.rank ? current : prev,
      dataBased[0],
    );
  } else if (locationBased.length > 0) {
    return locationBased.reduce(
      (prev, current) =>
        current.match.rank > prev.match.rank ? current : prev,
      locationBased[0],
    );
  } else {
    return undefined;
  }
};
