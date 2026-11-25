import { createElement, memo, useEffect, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, cancelAnimation } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg';
import { logoSymbol, mascotSvg, sceneSvg, type Expression, type MascotId, type Pose, type SceneKind, type SvgNode } from '@adultingos/brand';
import { useAppStore, useReducedMotion } from '@/state/appStore';

const COMPONENTS: Record<string, unknown> = {
  g: G, path: Path, circle: Circle, ellipse: Ellipse, rect: Rect, line: Line, polyline: Polyline, polygon: Polygon,
  defs: Defs, linearGradient: LinearGradient, radialGradient: RadialGradient, stop: Stop,
};

/** Renders a brand SvgNode tree with react-native-svg. */
function renderNode(node: SvgNode, key: string | number): ReactNode {
  const Comp = COMPONENTS[node.t];
  if (!Comp) return null;
  return createElement(Comp as never, { key, ...node.p }, node.c?.map((c, i) => renderNode(c, i)));
}

export const SvgTree = memo(function SvgTree({ node, size, width, height }: { node: SvgNode; size?: number; width?: number; height?: number }) {
  return (
    <Svg viewBox={String(node.p.viewBox)} width={width ?? size} height={height ?? size}>
      {node.c?.map((c, i) => renderNode(c, i))}
    </Svg>
  );
});

export type MascotAnimation = 'idle' | 'celebrate' | 'none';

/**
 * An Adulting Buddy. Decorative by default (hidden from screen readers);
 * pass `label` when the mascot carries meaning. Honours "hide mascots",
 * "mascot animations" and reduced-motion settings.
 */
export function Mascot({
  id, expression = 'neutral', pose = 'idle', size = 96, animation = 'idle', label, style, force,
}: {
  id: MascotId; expression?: Expression; pose?: Pose; size?: number; animation?: MascotAnimation; label?: string; style?: StyleProp<ViewStyle>; force?: boolean;
}) {
  const show = useAppStore((s) => s.prefs.showMascots);
  const animate = useAppStore((s) => s.prefs.mascotAnimations) && !useReducedMotion() && animation !== 'none';
  const y = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(y);
      y.value = 0;
      return;
    }
    if (animation === 'celebrate') {
      scale.value = withSequence(withSpring(1.15, { damping: 6 }), withSpring(1));
    }
    y.value = withRepeat(withSequence(withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })), -1, false);
    return () => cancelAnimation(y);
  }, [animate, animation, y, scale]);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: scale.value }] }));
  if (!show && !force) return null;
  return (
    <View
      style={style}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}
    >
      <Animated.View style={aStyle}>
        <SvgTree node={mascotSvg(id, { expression, pose })} size={size} />
      </Animated.View>
    </View>
  );
}

export function SceneIllustration({ id, kind, width = 220 }: { id: MascotId; kind: SceneKind; width?: number }) {
  const show = useAppStore((s) => s.prefs.showMascots);
  if (!show) return null;
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <SvgTree node={sceneSvg(id, kind)} width={width} height={(width * 220) / 252} />
    </View>
  );
}

export function LogoMark({ size = 40, onDark }: { size?: number; onDark?: boolean }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="AdultingOS">
      <SvgTree node={logoSymbol(onDark ? 'onDark' : 'color')} size={size} />
    </View>
  );
}
