import React, { forwardRef, useCallback } from 'react';
import {
  BottomSheetModal as RNBottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
  scrollable?: boolean;
}

export const BottomSheet = forwardRef<RNBottomSheetModal, BottomSheetProps>(
  ({ children, snapPoints = ['50%'], onDismiss, scrollable = false }, ref) => {
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
        />
      ),
      [],
    );

    return (
      <RNBottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        onDismiss={onDismiss}
        enablePanDownToClose
      >
        {scrollable ? (
          <BottomSheetScrollView contentContainerStyle={styles.content}>
            {children}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView style={styles.content}>
            {children}
          </BottomSheetView>
        )}
      </RNBottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: Colors.gray200,
  },
  content: {
    paddingHorizontal: Spacing.s6,
    paddingBottom: Spacing.s6,
  },
});
