import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { type ItemResponse } from '@/lib/api';
import { ItemCard } from './ItemCard';

interface Props {
  items: ItemResponse[];
  onArchive: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  ListEmptyComponent: React.ReactElement;
  ListHeaderComponent?: React.ReactElement;
}

export function ClosetGrid({
  items,
  onArchive,
  onRefresh,
  refreshing,
  ListEmptyComponent,
  ListHeaderComponent,
}: Props) {
  return (
    <FlashList
      data={items}
      numColumns={2}
      masonry
      keyExtractor={(item: ItemResponse) => item.id}
      renderItem={({ item, columnIndex }: ListRenderItemInfo<ItemResponse> & { columnIndex?: number }) => (
        <View style={columnIndex === 0 ? styles.left : styles.right}>
          <ItemCard item={item} onArchive={onArchive} />
        </View>
      )}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  left: { paddingLeft: 16, paddingRight: 5 },
  right: { paddingLeft: 5, paddingRight: 16 },
});
