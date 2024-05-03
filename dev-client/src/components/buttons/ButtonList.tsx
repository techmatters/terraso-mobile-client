import {Divider} from 'native-base';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {Fragment, Children} from 'react';

export type ButtonListProps = {
  children: React.ReactNode;
};

export function ButtonList({children}: ButtonListProps) {
  return (
    <Column mt="12px" mb="24px" space="6px">
      <Divider />
      {Children.map(children, child => {
        return (
          <Fragment>
            {child}
            <Divider />
          </Fragment>
        );
      })}
    </Column>
  );
}
