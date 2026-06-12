import React, {useState} from 'react';
import {Appbar, Menu} from 'react-native-paper';
import {ORANGE} from '../theme';

type Props = {
  title: string;
  onBack?: () => void;
};

export default function Header({title, onBack}: Props) {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <Appbar.Header style={{backgroundColor: ORANGE}} statusBarHeight={0}>
      {onBack && (
        <Appbar.BackAction onPress={onBack} iconColor="#fff" />
      )}
      <Appbar.Content
        title={title}
        titleStyle={{color: '#fff', fontWeight: '700', fontSize: 18}}
      />
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Appbar.Action
            icon="dots-vertical"
            iconColor="#fff"
            onPress={() => setMenuVisible(true)}
          />
        }>
        <Menu.Item onPress={() => setMenuVisible(false)} title="Settings" leadingIcon="cog" />
        <Menu.Item onPress={() => setMenuVisible(false)} title="Help" leadingIcon="help-circle" />
        <Menu.Item onPress={() => setMenuVisible(false)} title="Logout" leadingIcon="logout" />
      </Menu>
    </Appbar.Header>
  );
}
