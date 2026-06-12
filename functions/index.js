const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");

admin.initializeApp();

const ADMIN_HASH = process.env.ADMIN_HASH || "";
const VOC_HASH = process.env.VOC_HASH || "";

exports.verifyAdminPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "익명 인증이 필요합니다.");
  }

  const {password} = request.data;
  if (!password || typeof password !== "string") {
    throw new HttpsError("invalid-argument", "비밀번호를 입력하세요.");
  }

  if (!ADMIN_HASH) {
    throw new HttpsError("failed-precondition", "서버 인증 설정이 완료되지 않았습니다.");
  }

  const isValid = await bcrypt.compare(password, ADMIN_HASH);
  if (!isValid) {
    return {success: false, error: "invalid"};
  }

  await admin.auth().setCustomUserClaims(request.auth.uid, {
    admin: true,
    voc: true,
  });

  return {success: true};
});

exports.verifyVocPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "익명 인증이 필요합니다.");
  }

  const {password} = request.data;
  if (!password || typeof password !== "string") {
    throw new HttpsError("invalid-argument", "비밀번호를 입력하세요.");
  }

  if (!VOC_HASH) {
    throw new HttpsError("failed-precondition", "서버 인증 설정이 완료되지 않았습니다.");
  }

  const isValid = await bcrypt.compare(password, VOC_HASH);
  if (!isValid) {
    return {success: false, error: "invalid"};
  }

  const currentClaims =
    (await admin.auth().getUser(request.auth.uid)).customClaims || {};
  await admin.auth().setCustomUserClaims(request.auth.uid, {
    ...currentClaims,
    voc: true,
  });

  return {success: true};
});

exports.revokeAdminAccess = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "인증이 필요합니다.");
  }

  await admin.auth().setCustomUserClaims(request.auth.uid, {});
  return {success: true};
});
