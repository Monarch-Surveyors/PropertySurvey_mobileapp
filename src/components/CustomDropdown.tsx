import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Modal, FlatList} from 'react-native';
import {Text, Surface} from 'react-native-paper';
import {ORANGE} from '../theme';

type Props = {
  label: string;
  items: string[];
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
};

export default function CustomDropdown({label, items, value, onChange, required}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}>
        <Text style={[styles.selectorText, !value && styles.placeholder]} numberOfLines={1}>
          {value || 'Select'}
        </Text>
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <Surface style={styles.dropdown} elevation={5}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <FlatList
              data={items}
              keyExtractor={item => item}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.item, item === value && styles.selectedItem]}
                  onPress={() => {
                    onChange(item);
                    setVisible(false);
                  }}>
                  <Text style={[styles.itemText, item === value && styles.selectedItemText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Surface>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: '#757575',
    marginBottom: 4,
    fontWeight: '500',
  },
  required: {
    color: '#F44336',
    fontWeight: '700',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
    minHeight: 42,
  },
  selectorText: {
    fontSize: 13,
    color: '#212121',
    flex: 1,
  },
  placeholder: {
    color: '#BDBDBD',
  },
  arrow: {
    fontSize: 12,
    color: '#9E9E9E',
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dropdown: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#fff',
    maxHeight: 260,
    overflow: 'hidden',
  },
  dropdownTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: '700',
    fontSize: 15,
    color: '#212121',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAFA',
  },
  selectedItem: {
    backgroundColor: '#FFF3E0',
  },
  itemText: {
    fontSize: 14,
    color: '#424242',
  },
  selectedItemText: {
    color: ORANGE,
    fontWeight: '600',
  },
});
