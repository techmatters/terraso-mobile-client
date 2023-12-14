/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {
  Box,
  Button,
  Column,
  FlatList,
  Heading,
  Pressable,
  Row,
  Text,
} from 'native-base';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {useTranslation} from 'react-i18next';
import {Icon, IconButton} from 'terraso-mobile-client/components/Icons';
import {AddIntervalModal} from 'terraso-mobile-client/components/AddIntervalModal';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {Modal} from 'terraso-mobile-client/components/Modal';
import {BottomSheetModal} from 'terraso-mobile-client/components/BottomSheetModal';
import {EditIntervalModalContent} from 'terraso-mobile-client/screens/SoilScreen/components/EditIntervalModalContent';
import {useMemo, useCallback} from 'react';
import {
  LabelledDepthInterval,
  SoilData,
  methodRequired,
  soilPitMethods,
  updateSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {DepthPresets} from 'terraso-mobile-client/constants';
import {Formik} from 'formik';
import {FormRadioGroup} from 'terraso-mobile-client/components/form/FormRadioGroup';
import {FormRadio} from 'terraso-mobile-client/components/form/FormRadio';

export const SoilScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(state => state.soilId.soilData[siteId]) as
    | SoilData
    | undefined;
  const project = useSelector(state => {
    const projectId = state.site.sites[siteId].projectId;
    return projectId ? state.soilId.projectSettings[projectId] : undefined;
  });

  const projectDepthIntervals = useMemo(() => {
    return project?.depthIntervals ?? [];
  }, [project]);

  const projectRequiredInputs = useMemo(() => {
    return soilPitMethods.filter(m => (project ?? {})[methodRequired(m)]);
  }, [project]);

  const soilDataDepthIntervals = useMemo(() => {
    return soilData?.depthIntervals ?? [];
  }, [soilData]);

  const validSoilDataDepthIntervals = useMemo(() => {
    return soilDataDepthIntervals.filter(({depthInterval: a}) =>
      projectDepthIntervals.every(
        ({depthInterval: b}) => a.end <= b.start || a.start >= b.end,
      ),
    );
  }, [projectDepthIntervals, soilDataDepthIntervals]);

  const allIntervals = useMemo(
    () =>
      projectDepthIntervals
        .concat(validSoilDataDepthIntervals)
        .sort((a, b) => a.depthInterval.start - b.depthInterval.start),
    [projectDepthIntervals, validSoilDataDepthIntervals],
  );

  const existingIntervals = useMemo(
    () => allIntervals.map(interval => interval.depthInterval),
    [allIntervals],
  );
  const dispatch = useDispatch();

  const onAddDepthInterval = useCallback(
    async (interval: LabelledDepthInterval) => {
      await dispatch(updateSoilDataDepthInterval({siteId, ...interval}));
    },
    [siteId, dispatch],
  );

  const preset = useMemo(() => {
    if (project !== undefined) {
      if (project.depthIntervalPreset === 'CUSTOM') {
        return 'PROJECT_CUSTOM';
      }
      if (project.depthIntervalPreset !== 'NONE') {
        // project preset takes precedence over site
        return project.depthIntervalPreset;
      }
    }
    if (
      soilData === undefined ||
      soilData.depthIntervalPreset === null ||
      soilData.depthIntervalPreset === undefined
    ) {
      return 'NONE';
    }
    if (soilData.depthIntervalPreset === 'CUSTOM') {
      return 'CUSTOM';
    }
    return soilData.depthIntervalPreset;
  }, [project, soilData]);

  const customPreset = useMemo(
    () => preset === 'CUSTOM' || preset === 'NONE',
    [preset],
  );

  return (
    <BottomSheetModalProvider>
      <Column backgroundColor="grey.300" flex="1" width="100%">
        <FlatList
          data={allIntervals}
          renderItem={({item: interval}) => (
            <Column>
              <DepthIntervalEditor
                siteId={siteId}
                interval={interval}
                requiredInputs={projectRequiredInputs}
                customPreset={customPreset}
              />
              <InputsList project={project} />
            </Column>
          )}
          keyExtractor={({depthInterval: {start, end}}) => `${start}:${end}`}
          ListHeaderComponent={
            <>
              <Row backgroundColor="background.default" px="16px" py="12px">
                <Heading variant="h6">{t('soil.surface')}</Heading>
              </Row>
              <Box height="16px" />
              <Row
                backgroundColor="background.default"
                px="16px"
                py="12px"
                justifyContent="space-between">
                <Heading variant="h6">{t('soil.pit')}</Heading>
                <RestrictBySiteRole
                  role={[
                    {kind: 'site', role: 'owner'},
                    {kind: 'project', role: 'manager'},
                  ]}>
                  <ChangePresetModal />
                </RestrictBySiteRole>
              </Row>
            </>
          }
          ListFooterComponent={
            <RestrictBySiteRole
              role={[
                {kind: 'site', role: 'owner'},
                {kind: 'project', role: 'manager'},
                {kind: 'project', role: 'contributor'},
              ]}>
              <Modal
                trigger={onOpen => (
                  <Button
                    size="lg"
                    variant="fullWidth"
                    backgroundColor="primary.dark"
                    justifyContent="start"
                    _text={{
                      color: 'primary.contrast',
                    }}
                    _icon={{
                      color: 'primary.contrast',
                    }}
                    width="full"
                    borderRadius="0px"
                    leftIcon={<Icon name="add" />}
                    onPress={onOpen}>
                    {t('soil.add_depth_label')}
                  </Button>
                )}>
                <DepthIntervalEditor
                  siteId={siteId}
                  requiredInputs={projectRequiredInputs}
                  customPreset={customPreset}
                />
              </Modal>
            </RestrictBySiteRole>
          }
        />
      </Column>
    </BottomSheetModalProvider>
  );
};

const DepthIntervalEditor = ({
  siteId,
  interval: {label, depthInterval},
  requiredInputs,
  customPreset,
}: {
  siteId: string;
  interval: LabelledDepthInterval;
  requiredInputs: string[];
  customPreset: boolean;
}) => {
  return (
    <Row
      backgroundColor="primary.dark"
      justifyContent="space-between"
      px="12px"
      py="8px">
      <Heading variant="h6" color="primary.contrast">
        {label && `${label}: `}
        {`${depthInterval.start}-${depthInterval.end} cm`}
      </Heading>
      <BottomSheetModal
        trigger={onOpen => (
          <IconButton
            name="more-vert"
            _icon={{color: 'primary.contrast'}}
            onPress={onOpen}
          />
        )}>
        <EditIntervalModalContent
          siteId={siteId}
          depthInterval={depthInterval}
          requiredInputs={requiredInputs}
          customPreset={customPreset}
        />
      </BottomSheetModal>
    </Row>
  );
};

type InputListProps = {
  project?: ProjectSoilSettings;
};

const InputsList = ({project}: InputListProps) => {
  const {t} = useTranslation();
  const requiredMethods = project
    ? soilPitMethods.filter(method => project[methodRequired(method)])
    : ['soilTexture', 'soilColor', 'soilStructure'];

  return (
    <>
      {requiredMethods.map(method => (
        // TODO: eventually should take users to relevant screen
        <Pressable key={method} onPress={() => {}}>
          <Box
            _text={{
              textTransform: 'uppercase',
              fontSize: '14px',
              lineHeight: '14px',
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
            py="15px"
            pl="50px"
            backgroundColor="primary.contrast"
            borderColor="grey.300"
            borderWidth={1}>
            {t(`soil.collection_method.${method}`)}
          </Box>
        </Pressable>
      ))}
    </>
  );
};

const ChangePresetModal = ({}: {}) => {
  const {t} = useTranslation();
  return (
    <Modal
      trigger={onOpen => (
        <IconButton
          name="tune"
          _icon={{color: 'action.active'}}
          onPress={onOpen}
        />
      )}>
      <Column space="10px">
        <Heading variant="h6" fontSize="20px" mr="20px">
          Change soil pit depths
        </Heading>
        <Text variant="body-1">
          Data already entered for a depth will be deleted when the depth
          interval is changed.
        </Text>

        <Formik initialValues={{}} onSubmit={() => {}}>
          {({handleSubmit, isValid, isSubmitting}) => (
            <>
              <FormRadioGroup
                name="preset"
                label="Depth Intervals"
                values={DepthPresets}
                renderRadio={value => (
                  <FormRadio value={value} key={value} size="sm">
                    {t(`projects.inputs.depth_intervals.${value}`)}
                  </FormRadio>
                )}
              />
              <Button
                onPress={handleSubmit}
                isDisabled={!isValid || isSubmitting}>
                Save
              </Button>
            </>
          )}
        </Formik>
      </Column>
    </Modal>
  );
};
