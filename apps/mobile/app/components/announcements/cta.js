import { Linking, View } from "react-native";
//import SettingsBackupAndRestore from '../../screens/settings/backup-restore';
import { eSendEvent, presentSheet } from "../../services/event-manager";
import Sync from "../../services/sync";
import { useThemeStore } from "../../stores/use-theme-store";
import {
  eCloseAnnouncementDialog,
  eCloseProgressDialog
} from "../../utils/events";
import { SIZE } from "../../utils/size";
import { sleep } from "../../utils/time";
import { PricingPlans } from "../premium/pricing-plans";
import SheetProvider from "../sheet-provider";
import { Progress } from "../sheets/progress";
import { Button } from "../ui/button";
import { allowedOnPlatform, getStyle } from "./functions";

export const Cta = ({ actions, style = {}, color, inline }) => {
  const colors = useThemeStore((state) => state.colors);
  let buttons =
    actions.filter((item) => allowedOnPlatform(item.platforms)) || [];

  const onPress = async (item) => {
    if (!inline) {
      eSendEvent(eCloseAnnouncementDialog);
      await sleep(500);
    }
    if (item.type === "link") {
      Linking.openURL(item.data).catch(console.log);
    } else if (item.type === "promo") {
      presentSheet({
        component: (
          <PricingPlans
            marginTop={1}
            promo={{
              promoCode: item.data,
              text: item.title
            }}
          />
        )
      });
    } else if (item.type === "force-sync") {
      eSendEvent(eCloseProgressDialog);
      await sleep(300);
      Progress.present();
      Sync.run("global", true, true, () => {
        eSendEvent(eCloseProgressDialog);
      });
    }
  };
  return (
    <View
      style={{
        paddingHorizontal: 12,
        ...getStyle(style),
        flexDirection: inline ? "row" : "column"
      }}
    >
      <SheetProvider context="premium_cta" />

      {inline ? (
        <>
          {buttons.length > 0 &&
            buttons.slice(0, 1).map((item) => (
              <Button
                key={item.title}
                title={item.title}
                fontSize={SIZE.sm}
                type="transparent"
                textStyle={{
                  textDecorationLine: "underline"
                }}
                onPress={() => onPress(item)}
                bold
                style={{
                  height: 30,
                  alignSelf: "flex-start",
                  paddingHorizontal: 0,
                  marginTop: -6
                }}
              />
            ))}

          {buttons.length > 1 &&
            buttons.slice(1, 2).map((item) => (
              <Button
                key={item.title}
                title={item.title}
                fontSize={SIZE.sm}
                type="gray"
                onPress={() => onPress(item)}
                width={null}
                height={30}
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 0,
                  marginTop: -6,
                  marginLeft: 12
                }}
                textStyle={{
                  textDecorationLine: "underline"
                }}
              />
            ))}
        </>
      ) : (
        <>
          {buttons.length > 0 &&
            buttons.slice(0, 1).map((item) => (
              <Button
                key={item.title}
                title={item.title}
                fontSize={SIZE.md}
                buttonType={{
                  color: color ? color : colors.accent,
                  text: colors.light,
                  selected: color ? color : colors.accent,
                  opacity: 1
                }}
                onPress={() => onPress(item)}
                width={250}
                style={{
                  marginBottom: 5,
                  borderRadius: 100
                }}
              />
            ))}

          {buttons.length > 1 &&
            buttons.slice(1, 2).map((item) => (
              <Button
                key={item.title}
                title={item.title}
                fontSize={SIZE.xs + 1}
                type="gray"
                onPress={() => onPress(item)}
                width={null}
                height={30}
                style={{
                  minWidth: "50%",
                  marginTop: 5
                }}
                textStyle={{
                  textDecorationLine: "underline"
                }}
              />
            ))}
        </>
      )}
    </View>
  );
};
