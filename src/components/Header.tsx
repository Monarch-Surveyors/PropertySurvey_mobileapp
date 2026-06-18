import React from 'react';
import {Appbar} from 'react-native-paper';
import {ORANGE} from '../theme';

type Props = {
  title: string;
  onBack?: () => void;
  rightButton?: React.ReactNode;
};

export default function Header({title, onBack, rightButton}: Props) {
  return (
    <Appbar.Header style={{backgroundColor: ORANGE}} statusBarHeight={0}>
      {onBack && (
        <Appbar.BackAction onPress={onBack} iconColor="#fff" />
      )}
      <Appbar.Content
        title={title}
        titleStyle={{color: '#fff', fontWeight: '700', fontSize: 18}}
      />
      {rightButton}
    </Appbar.Header>
  );
}
