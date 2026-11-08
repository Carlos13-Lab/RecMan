import * as Device from "expo-device";

export const getDeviceInfo = () => ({
  model: Device.modelName ?? undefined,
  os: Device.osName ?? undefined,
  version: Device.osVersion ?? undefined,
});
