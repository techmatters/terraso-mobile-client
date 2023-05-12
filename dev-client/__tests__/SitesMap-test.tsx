import 'react-native';
import React from 'react';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';
import SiteMap from '../components/SiteMap';

const exampleSites = [
    new DisplaySite({
        lat: 0,
        lon: 0,
        name: "TEST SITE 1"
    }),
    new DisplaySite({
        lat: 0.0001,
        lon: 0.0001,
        name: "TEST SITE 2"
    })
];

const exampleSite = exampleSites[0];

it('displays sites', () => {
    const component = renderer.create(<SiteMap sites={exampleSites} center={[0, 0]} />);
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});
