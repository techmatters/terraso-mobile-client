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

import {createContext, useContext, useCallback, useRef} from 'react';
import ProjectTabs from 'terraso-mobile-client/components/projects/ProjectTabs';
import {
  AppBar,
  ScreenCloseButton,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {BottomSheetModal, BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {useSelector} from 'terraso-mobile-client/model/store';
import {InfoModal} from 'terraso-mobile-client/components/common/infoModals/InfoModal';

type Props = {projectId: string};

const InfoPressContext = createContext({onInfoPress: () => {}});

export const useInfoPress = () => useContext(InfoPressContext);

export const ProjectViewScreen = ({projectId}: Props) => {
  const project = useSelector(state => state.project.projects[projectId]);
  const infoModalRef = useRef<BottomSheetModal>(null);

  const onInfoPress = useCallback(
    () => infoModalRef.current?.present(),
    [infoModalRef],
  );
  const onInfoClose = useCallback(
    () => infoModalRef.current?.dismiss(),
    [infoModalRef],
  );

  return (
    <InfoPressContext.Provider value={{onInfoPress}}>
      <BottomSheetModalProvider>
        <ScreenScaffold
          AppBar={
            <AppBar LeftButton={<ScreenCloseButton />} title={project?.name} />
          }>
          <ProjectTabs project={project} />
        </ScreenScaffold>
        <InfoModal ref={infoModalRef} onClose={onInfoClose} />
      </BottomSheetModalProvider>
    </InfoPressContext.Provider>
  );
};
