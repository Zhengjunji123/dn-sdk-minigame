declare module "dh-mini-sdk-for-wx-2.3.1" {
  type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

  type Callback = (result: any) => void;

  type SuccessCallback = (response: Response) => void;

  type FailCallback = (error: Error) => void;

  type CompleteCallback = (result: Result) => void;

  interface Response {
    code: string | number | undefined;
    data: any;
    message: string
  }

  interface Error {
    code: string | number | undefined;
    data: any;
    message: string
  }

  interface Result {
    code: string | number | undefined;
    data: any;
    message: string
  }

  interface Options {
    requests: Requests;
    gameAppId: string | number;
    appId: string | number;
    appVersion: string;
    packageName: string;
    channel: string | number;
    mainChannel: string | number;
    secondChannel: string | number;
    heartbeatEnable?: boolean;
    reyunAppKey?: string;
    gravityEngineAccessToken?: string;
    gravityEngineDebug?: boolean;
    gravityEnginePayEventEnable?: boolean;
    tencentUserActionId?: number;
    tencentSecretKey?: string;
    tencentDebug?: boolean;
  }

  interface Requests {
    login: string | string[];
    order: string | string[];
    pay: string | string[];
    midas: string | string[];
    customerService: string | string[];
    survey: string | string[];
    svip: string | string[];
    gameClub: string | string[];
    voiceChat: string | string[];
    subscribe: string | string[];
    log: string | string[];
    errorLog: string | string[];
    dyb?: string;
  }

  interface UserInfo {
    accountId: number;
    accountName: string;
    accountView: string;
    region: number;
    loginType: number;
    loginTimestamp: number;
    expireTimestamp: number;
    token: string;
    sign: string;
    isFirstLogin: boolean;
    userExtraInfo: UserExtraInfo;
  }

  interface UserExtraInfo {
    openId: string;
    sign: string;
  }

  interface BaseUserRoleInfo {
    type: "LOGIN_GAME" | "CREATE_ROLE" | "LEVEL_UP";
    areaId: string | number;
    areaName: string | number;
    roleId: string | number;
    roleName: string | number;
    roleLevel: number;
    roleVipLevel?: number;
  }

  interface PaySuccessUserRoleInfo extends BaseUserRoleInfo {
    type: "PAY_SUCCESS";
    itemId: string;
    itemName: string;
    orderId: string;
    orderPrice: number;
    currency?: "CNY" | "USD";
    payType?: string;
  }

  type UserRoleInfo = BaseUserRoleInfo | PaySuccessUserRoleInfo;

  interface LoginOptions {
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface CreateUserInfoButtonOptions {
    type: "text" | "image";
    text?: string;
    image?: string;
    style: {
      top: number;
      left: number;
      width: number;
      height: number;
      borderWidth?: number;
      borderRadius?: number;
      borderColor?: string;
      backgroundColor?: string;
      color?: string;
      fontSize?: number;
      textAlign?: string;
      lineHeight?: number;
    };
    withCredentials?: boolean;
    lang?: "en" | "zh_CN" | "zh_TW";
  }

  interface UserInfoButton {
    show: () => void;
    hide: () => void;
    destroy: () => void;
    onTap: (listener: Callback) => void;
    offTap: (listener: Callback) => void;
  }

  interface GetUserInfoOptions {
    withCredentials?: boolean;
    lang?: "en" | "zh_CN" | "zh_TW";
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface GetUserDataOptions {
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface PayOptions {
    cardMessageTitle?: string;
    cardMessageImage?: string;
    payScene?: "standard" | "direct";
    areaId?: string | number;
    areaName?: string;
    roleId?: string | number;
    roleName?: string;
    roleLevel?: number;
    itemId: string;
    itemName: string;
    itemNum?: number;
    itemPrice: number;
    currency?: "CNY" | "USD";
    rate: number;
    memo?: string;
    remark?: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface CreateRewardedVideoAdOptions {
    adUnitId: string;
    adMultiton?: boolean;
    adPlatform?: string;
    adPosition?: string;
    onLoad?: (response: Response) => void;
    onClose?: (result: Result) => void;
    onComplete?: (result: Result) => void;
    onError?: (error: Error) => void;
  }

  interface RewardedVideoAd {
    load: (callback?: Callback) => void;
    show: (options?: RewardedVideoAdShowOptions | Callback, callback?: Callback) => void;
    destroy: () => void;
  }

  interface RewardedVideoAdShowOptions {
    adPosition?: string;
  }

  interface DirectAdStatus {
    isInMask: boolean;
    isInDirectGameAd: boolean;
  }

  interface CheckMsgSecurityOptions {
    msg: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface CheckImgSecurityOptions {
    imgPath: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface CheckMediaSecurityOptions {
    mediaUrl: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface OpenCustomerServiceOptions {
    cardMessageTitle: string;
    cardMessageImage: string;
    areaId?: string | number;
    roleId: string | number;
    roleName: string;
    roleLevel?: number;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface OpenSurveyOptions {
    areaId?: string | number;
    roleId: string | number;
    roleName: string;
    roleLevel?: number;
    surveyId: number;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface OpenSvipOptions {
    cardMessageTitle: string;
    cardMessageImage: string;
    areaId?: string | number;
    roleId: string | number;
    roleName: string;
    roleLevel?: number;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface CreateFeedbackButtonOptions {
    type: "text" | "image";
    text?: string;
    image?: string;
    style: {
      top: number;
      left: number;
      width: number;
      height: number;
      borderWidth?: number;
      borderRadius?: number;
      borderColor?: string;
      backgroundColor?: string;
      color?: string;
      fontSize?: number;
      textAlign?: string;
      lineHeight?: number;
    }
  }

  interface FeedbackButton {
    show: () => void;
    hide: () => void;
    destroy: () => void;
    onTap: (listener: Callback) => void;
    offTap: (listener: Callback) => void;
  }

  interface SetShareOptions {
    title?: string;
    imageUrl?: string;
    imageUrlId?: string;
    imagePreviewUrl?: string;
    imagePreviewUrlId?: string;
    path?: string;
    query?: Record<string, unknown>;
  }

  interface ShareOptions {
    title?: string;
    imageUrl?: string;
    imageUrlId?: string;
    toCurrentGroup?: boolean;
    path?: string;
    query?: Record<string, unknown>;
  }

  interface ShowShareImageMenuOptions {
    path: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface SetFavoriteOptions {
    title?: string;
    imageUrl?: string;
    query?: Record<string, unknown>;
    disableForward?: boolean;
  }

  interface SubscribeMessageOptions {
    tmplIds: string[];
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface SubscribeSystemMessageOptions {
    msgTypeList: string[];
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface CreateGameClubButtonOptions {
    type: "text" | "image";
    text?: string;
    icon?: "green" | "white" | "dark" | "light";
    image?: string;
    style: {
      top: number;
      left: number;
      width: number;
      height: number;
      borderWidth?: number;
      borderRadius?: number;
      borderColor?: string;
      backgroundColor?: string;
      color?: string;
      fontSize?: number;
      textAlign?: string;
      lineHeight?: number;
    };
    openlink?: string;
    hasRedDot?: boolean;
  }

  interface GameClubButton {
    show: () => void;
    hide: () => void;
    destroy: () => void;
    onTap: (listener: Callback) => void;
    offTap: (listener: Callback) => void;
  }

  interface ShareImageToGameClubOptions {
    title: string;
    content: string;
    url?: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface ShareCanvasToGameClubOptions {
    title: string;
    content: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    destWidth?: number;
    destHeight?: number;
    fileType?: "png" | "jpg";
    quality?: number;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface PushFeedOptions {
    eventId: string;
    query?: Record<string, unknown>;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface GetGameClubDataOptions {
    dataTypeList: GameClubDataType[];
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface GameClubDataType {
    type: number;
    subKey?: string;
  }

  interface VoiceChatMuteSettings {
    microphone?: boolean;
    speaker?: boolean;
  }

  interface JoinVoiceChatOptions {
    roomType?: "voice" | "video";
    groupId: string;
    mute?: VoiceChatMuteSettings;
    forceCellularNetwork?: boolean;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface ExitVoiceChatOptions {
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface ChangeVoiceChatMuteSettingsOptions {
    mute: VoiceChatMuteSettings;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface OpenChannelsUserProfileOptions {
    finderUserName: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface OpenChannelsEventOptions {
    finderUserName: string;
    eventId: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface OpenChannelsActivityOptions {
    finderUserName: string;
    feedId: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface OpenChannelsLiveOptions {
    finderUserName: string;
    feedId?: string;
    noticeId?: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface ReserveChannelsLiveOptions {
    noticeId: string;
  }

  interface GetChannelsLiveNoticeInfoOptions {
    finderUserName: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface GetChannelsLiveInfoOptions {
    finderUserName: string;
    startTime?: number;
    endTime?: number;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface GameRecorder {
    isFrameSupported(): boolean;
    isSoundSupported(): boolean;
    isVolumeSupported(): boolean;
    isAtempoSupported(): boolean;
    on(event: string, callback: Callback): void;
    off(event: string, callback: Callback): void;
    start(options?: GameRecorderStartOptions): Promise<any>;
    pause(): Promise<any>;
    resume(): Promise<any>;
    stop(): Promise<any>;
    abort(): Promise<any>;
  }

  interface GameRecorderStartOptions {
    fps?: number;
    bitrate?: number;
    gop?: number;
    duration?: number;
    hookBgm?: boolean;
  }

  interface ShareGameRecorderVideoOptions {
    title?: string;
    desc?: string;
    path?: string;
    query?: Record<string, unknown>;
    timeRange?: number[][];
    bgm?: string;
    volume?: number;
    atempo?: number;
    audioMix?: boolean;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface CreateGameRecorderShareButtonOptions {
    icon?: string;
    image?: string;
    text?: string;
    style?: {
      top?: number;
      left?: number;
      height?: number;
      paddingLeft?: number;
      paddingRight?: number;
      color?: string;
      fontSize?: number;
      iconMarginRight?: number;
    };
    share?: {
      query?: Record<string, unknown>;
      timeRange?: number[][];
      bgm?: string;
      volume?: number;
      atempo?: number;
      audioMix?: boolean;
    }
  }

  interface GameRecorderShareButton {
    show: () => void;
    hide: () => void;
    destroy: () => void;
    onTap: (listener: Callback) => void;
    offTap: (listener: Callback) => void;
  }

  interface RequirePrivacyAuthorizeOptions {
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface GetSettingOptions {
    withSubscriptions?: boolean;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface OpenSettingOptions {
    withSubscriptions?: boolean;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface ExitOptions {
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface RestartOptions {
    path?: string;
    success?: SuccessCallback;
    fail?: FailCallback;
    complete?: CompleteCallback;
  }

  interface ModalConfirmOptions {
    title: string;
    content: string;
    showCancel?: boolean;
    cancelText?: string;
    cancelColor?: string;
    confirmText?: string;
    confirmColor?: string;
    editable?: boolean;
    placeholderText?: string;
    success?: Callback;
    fail?: Callback;
    complete?: Callback;
  }

  interface BaseUploadRoleInfoOptions {
    type: "LOGIN_GAME" | "CREATE_ROLE" | "LEVEL_UP";
    areaId: string | number;
    areaName: string | number;
    roleId: string | number;
    roleName: string | number;
    roleLevel: number;
    roleVipLevel?: number;
  }

  interface PaySuccessUploadRoleInfoOptions extends BaseUploadRoleInfoOptions {
    type: "PAY_SUCCESS";
    itemId: string;
    itemName: string;
    orderId: string;
    orderPrice: number;
    currency?: string;
    payType?: string;
  }

  type UploadRoleInfoOptions = BaseUploadRoleInfoOptions | PaySuccessUploadRoleInfoOptions;

  interface BindThirdPlatformOptions {
    type: "GRAVITY_ENGINE";
    accountId: string | number;
    distinctId: string | number;
  }

  interface TrackEventGuidestepParams {
    stepId: string | number;
  }

  interface TrackEventCustomParams {
    eventName: string;
    extendParamJson: string;
    eventObj?: string;
    eventCode?: string;
    eventResult?: string;
    areaId?: string | number;
    roleId?: string | number;
  }

  interface TrackEventLogParams {
    logLevel: "d" | "e";
    logContent: string;
    [key: string]: any;
  }

  export default class DHMiniSDK {
    constructor(options: Options);

    readonly version: string;
    readonly libVersion: string;
    readonly env: "develop" | "trial" | "release";
    readonly system: any;
    readonly networkType: string;
    readonly deviceId: string;
    readonly deviceOS: string;
    readonly launchOptions: any;
    readonly requests: Requests;
    readonly gameAppId: string | number;
    readonly appId: string | number;
    readonly appVersion: string;
    readonly packageName: string;
    readonly channel: string | number;
    readonly mainChannel: string | number;
    readonly secondChannel: string | number;
    readonly userInfo: UserInfo | null;
    readonly userRoleInfo: UserRoleInfo | null;
    readonly isShow: boolean;
    readonly heartbeatEnable: boolean;
    readonly reyunAppKey?: string;
    readonly gravityEngineAccessToken?: string;
    readonly gravityEngineDebug?: boolean;
    readonly gravityEnginePayEventEnable?: boolean;
    readonly tencentUserActionId?: number;
    readonly tencentSecretKey?: string;
    readonly tencentDebug?: boolean;

    readonly login: (options: LoginOptions) => void;
    readonly getAccountId: (fallback?: string) => string;
    readonly getOpenId: (fallback?: string) => string;
    readonly getToken: (fallback?: string) => string;
    readonly isRegister: () => boolean;
    readonly createUserInfoButton: (options: CreateUserInfoButtonOptions) => UserInfoButton;
    readonly getUserInfo: (options: GetUserInfoOptions) => void;
    readonly getUserData: (options: GetUserDataOptions) => void;
    readonly pay: (options: PayOptions) => void;
    readonly createRewardedVideoAd: (options: CreateRewardedVideoAdOptions) => RewardedVideoAd;
    readonly getDirectAdStatusSync: () => DirectAdStatus | null;
    readonly onDirectAdStatusChange: (listener: Callback) => void;
    readonly offDirectAdStatusChange: (listener: Callback) => void;
    readonly checkMsgSecurity: (options: CheckMsgSecurityOptions) => void;
    readonly checkImgSecurity: (options: CheckImgSecurityOptions) => void;
    readonly checkMediaSecurity: (options: CheckMediaSecurityOptions) => void;
    readonly openCustomerService: (options: OpenCustomerServiceOptions) => void;
    readonly openSurvey: (options: OpenSurveyOptions) => void;
    readonly openSvip: (options: OpenSvipOptions) => void;
    readonly createFeedbackButton: (options: CreateFeedbackButtonOptions) => FeedbackButton;
    readonly setShare: (options: SetShareOptions) => void;
    readonly share: (options: ShareOptions) => void;
    readonly showShareImageMenu: (options: ShowShareImageMenuOptions) => void;
    readonly setFavorite: (options: SetFavoriteOptions) => void;
    readonly subscribeMessage: (options: SubscribeMessageOptions) => void;
    readonly subscribeSystemMessage: (options: SubscribeSystemMessageOptions) => void;
    readonly createGameClubButton: (options: CreateGameClubButtonOptions) => GameClubButton;
    readonly shareImageToGameClub: (options: ShareImageToGameClubOptions) => void;
    readonly shareCanvasToGameClub: (options: ShareCanvasToGameClubOptions) => void;
    readonly pushFeed: (options: PushFeedOptions) => void;
    readonly getGameClubData: (options: GetGameClubDataOptions) => void;
    readonly joinVoiceChat: (options: JoinVoiceChatOptions) => void;
    readonly exitVoiceChat: (options: ExitVoiceChatOptions) => void;
    readonly changeVoiceChatMuteSettings: (options: ChangeVoiceChatMuteSettingsOptions) => void;
    readonly onVoiceChatMembersChanged: (listener: Callback) => void;
    readonly offVoiceChatMembersChanged: (listener?: Callback) => void;
    readonly onVoiceChatSpeakersChanged: (listener: Callback) => void;
    readonly offVoiceChatSpeakersChanged: (listener?: Callback) => void;
    readonly onVoiceChatInterrupted: (listener: Callback) => void;
    readonly offVoiceChatInterrupted: (listener?: Callback) => void;
    readonly onVoiceChatStateChanged: (listener: Callback) => void;
    readonly offVoiceChatStateChanged: (listener?: Callback) => void;
    readonly openChannelsUserProfile: (options: OpenChannelsUserProfileOptions) => void;
    readonly openChannelsEvent: (options: OpenChannelsEventOptions) => void;
    readonly openChannelsActivity: (options: OpenChannelsActivityOptions) => void;
    readonly openChannelsLive: (options: OpenChannelsLiveOptions) => void;
    readonly reserveChannelsLive: (options: ReserveChannelsLiveOptions) => void;
    readonly getChannelsLiveNoticeInfo: (options: GetChannelsLiveNoticeInfoOptions) => void;
    readonly getChannelsLiveInfo: (options: GetChannelsLiveInfoOptions) => void;
    readonly getGameRecorder: () => GameRecorder;
    readonly shareGameRecorderVideo: (options: ShareGameRecorderVideoOptions) => void;
    readonly createGameRecorderShareButton: (options: CreateGameRecorderShareButtonOptions) => GameRecorderShareButton;
    readonly requirePrivacyAuthorize: (options: RequirePrivacyAuthorizeOptions) => void;
    readonly getSetting: (options: GetSettingOptions) => void;
    readonly openSetting: (options: OpenSettingOptions) => void;
    readonly onShow: (listener: Callback) => void;
    readonly offShow: (listener: Callback) => void;
    readonly onHide: (listener: Callback) => void;
    readonly offHide: (listener: Callback) => void;
    readonly getLaunchOptionsSync: () => any;
    readonly exit: (options: ExitOptions) => void;
    readonly restart: (options: RestartOptions) => void;
    readonly modal: {
      loading: (message: string) => void;
      message: (message: string) => void;
      success: (message: string) => void;
      error: (message: string) => void;
      confirm: (options: ModalConfirmOptions) => void;
    };
    readonly showErrorMessage: (message: string) => void;
    readonly showUpgradeMessage: (message?: string) => void;
    readonly uploadRoleInfo: (options: UploadRoleInfoOptions, callback?: Callback) => void;
    readonly bindThirdPlatform: (options: BindThirdPlatformOptions, callback?: Callback) => void;
    readonly trackEvent: {
      (eventId: "guidestep", eventParams: TrackEventGuidestepParams): void;
      (eventId: "custom", eventParams: TrackEventCustomParams): void;
      (eventId: `${Digit}${Digit}${Digit}${Digit}${Digit}${Digit}::${string}`, eventParams: TrackEventLogParams): void;
    };
  }
}