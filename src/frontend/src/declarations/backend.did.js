/* eslint-disable */

// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

export const _CaffeineStorageCreateCertificateResult = IDL.Record({
  'method' : IDL.Text,
  'blob_hash' : IDL.Text,
});
export const _CaffeineStorageRefillInformation = IDL.Record({
  'proposed_top_up_amount' : IDL.Opt(IDL.Nat),
});
export const _CaffeineStorageRefillResult = IDL.Record({
  'success' : IDL.Opt(IDL.Bool),
  'topped_up_amount' : IDL.Opt(IDL.Nat),
});
export const UserRole = IDL.Variant({
  'admin' : IDL.Null,
  'user' : IDL.Null,
  'guest' : IDL.Null,
});
export const UserProfile = IDL.Record({ 'name' : IDL.Text });

export const Section = IDL.Record({
  'id' : IDL.Text,
  'name' : IDL.Text,
  'createdAt' : IDL.Int,
  'description' : IDL.Text,
  'location' : IDL.Text,
});

export const Complaint = IDL.Record({
  'id' : IDL.Text,
  'unitSlNo' : IDL.Text,
  'unit' : IDL.Text,
  'serialNumber' : IDL.Text,
  'reportedBy' : IDL.Text,
  'amcTeam' : IDL.Text,
  'caseLoggedDate' : IDL.Int,
  'caseAttendedDate' : IDL.Opt(IDL.Int),
  'sparesTaken' : IDL.Text,
  'spareTakenDate' : IDL.Opt(IDL.Int),
  'caseClearedDate' : IDL.Opt(IDL.Int),
  'status' : IDL.Text,
  'remarks1' : IDL.Text,
  'remarks2' : IDL.Text,
  'createdAt' : IDL.Int,
});

export const MovementLog = IDL.Record({
  'id': IDL.Text,
  'dateTime': IDL.Int,
  'deviceType': IDL.Text,
  'serialNumber': IDL.Text,
  'action': IDL.Text,
  'previousSection': IDL.Text,
  'newSection': IDL.Text,
  'triggeredFrom': IDL.Text,
  'user': IDL.Text,
  'remarks': IDL.Text,
});

export const Device = IDL.Record({
  'id': IDL.Text,
  'serialNumber': IDL.Text,
  'deviceType': IDL.Text,
  'makeAndModel': IDL.Text,
  'companyName': IDL.Text,
  'amcTeam': IDL.Text,
  'amcStartDate': IDL.Int,
  'amcExpiryDate': IDL.Int,
  'assignedSeatId': IDL.Text,
  'sectionId': IDL.Text,
  'workingStatus': IDL.Text,
  'ipAddress': IDL.Text,
  'remarks': IDL.Text,
  'previousSection': IDL.Text,
  'dateMovedToStandby': IDL.Int,
  'createdAt': IDL.Int,
});

export const Seat = IDL.Record({
  'id': IDL.Text,
  'sectionId': IDL.Text,
  'seatNumber': IDL.Text,
  'currentUser': IDL.Text,
  'cpuSerial': IDL.Text,
  'monitorSerial': IDL.Text,
  'ip1': IDL.Text,
  'ip2': IDL.Text,
  'remarks': IDL.Text,
  'createdAt': IDL.Int,
});

export const StockImportRow = IDL.Record({
  'slNo' : IDL.Nat,
  'companyAndModel' : IDL.Text,
  'cpuSlNo' : IDL.Text,
  'monitorSlNo' : IDL.Text,
  'amcStartDate' : IDL.Int,
  'amcExpiryDate' : IDL.Int,
  'amcTeam' : IDL.Text,
});

export const idlService = IDL.Service({
  '_caffeineStorageBlobIsLive' : IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Bool], ['query']),
  '_caffeineStorageBlobsToDelete' : IDL.Func([], [IDL.Vec(IDL.Vec(IDL.Nat8))], ['query']),
  '_caffeineStorageConfirmBlobDeletion' : IDL.Func([IDL.Vec(IDL.Vec(IDL.Nat8))], [], []),
  '_caffeineStorageCreateCertificate' : IDL.Func([IDL.Text], [_CaffeineStorageCreateCertificateResult], []),
  '_caffeineStorageRefillCashier' : IDL.Func([IDL.Opt(_CaffeineStorageRefillInformation)], [_CaffeineStorageRefillResult], []),
  '_caffeineStorageUpdateGatewayPrincipals' : IDL.Func([], [], []),
  'createSection' : IDL.Func([Section], [], []),
  'getAllSections' : IDL.Func([], [IDL.Vec(Section)], ['query']),
  'updateSection' : IDL.Func([Section], [], []),
  'deleteSection' : IDL.Func([IDL.Text], [], []),
  'createDevice' : IDL.Func([Device], [], []),
  'getDevice' : IDL.Func([IDL.Text], [IDL.Opt(Device)], ['query']),
  'getAllDevices' : IDL.Func([], [IDL.Vec(Device)], ['query']),
  'updateDevice' : IDL.Func([Device], [], []),
  'deleteDevice' : IDL.Func([IDL.Text], [], []),
  'createSeat' : IDL.Func([Seat], [], []),
  'getSeat' : IDL.Func([IDL.Text], [IDL.Opt(Seat)], ['query']),
  'getAllSeats' : IDL.Func([], [IDL.Vec(Seat)], ['query']),
  'updateSeat' : IDL.Func([Seat], [], []),
  'deleteSeat' : IDL.Func([IDL.Text], [], []),
  'importStockRow' : IDL.Func([StockImportRow], [], []),
  'createComplaint' : IDL.Func([Complaint], [], []),
  'getAllComplaints' : IDL.Func([], [IDL.Vec(Complaint)], ['query']),
  'updateComplaint' : IDL.Func([Complaint], [], []),
  'deleteComplaint' : IDL.Func([IDL.Text], [], []),
  'createMovementLog' : IDL.Func([MovementLog], [], []),
  'getAllMovementLogs' : IDL.Func([], [IDL.Vec(MovementLog)], ['query']),
  'getDashboardStats' : IDL.Func([], [IDL.Record({
    'totalSeats' : IDL.Nat,
    'totalStandbyDevices' : IDL.Nat,
    'pendingComplaints' : IDL.Nat,
    'clearedComplaints' : IDL.Nat,
    'totalOtherDevices' : IDL.Nat,
    'totalDevices' : IDL.Nat,
  })], ['query']),
  'clearAllData' : IDL.Func([], [], []),
  'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
  'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
  'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
  'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const _CaffeineStorageCreateCertificateResult = IDL.Record({
    'method' : IDL.Text,
    'blob_hash' : IDL.Text,
  });
  const _CaffeineStorageRefillInformation = IDL.Record({
    'proposed_top_up_amount' : IDL.Opt(IDL.Nat),
  });
  const _CaffeineStorageRefillResult = IDL.Record({
    'success' : IDL.Opt(IDL.Bool),
    'topped_up_amount' : IDL.Opt(IDL.Nat),
  });
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const UserProfile = IDL.Record({ 'name' : IDL.Text });
  const Section = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'description' : IDL.Text,
    'location' : IDL.Text,
  });
  const Complaint = IDL.Record({
    'id' : IDL.Text,
    'unitSlNo' : IDL.Text,
    'unit' : IDL.Text,
    'serialNumber' : IDL.Text,
    'reportedBy' : IDL.Text,
    'amcTeam' : IDL.Text,
    'caseLoggedDate' : IDL.Int,
    'caseAttendedDate' : IDL.Opt(IDL.Int),
    'sparesTaken' : IDL.Text,
    'spareTakenDate' : IDL.Opt(IDL.Int),
    'caseClearedDate' : IDL.Opt(IDL.Int),
    'status' : IDL.Text,
    'remarks1' : IDL.Text,
    'remarks2' : IDL.Text,
    'createdAt' : IDL.Int,
  });
  const MovementLog = IDL.Record({
    'id': IDL.Text,
    'dateTime': IDL.Int,
    'deviceType': IDL.Text,
    'serialNumber': IDL.Text,
    'action': IDL.Text,
    'previousSection': IDL.Text,
    'newSection': IDL.Text,
    'triggeredFrom': IDL.Text,
    'user': IDL.Text,
    'remarks': IDL.Text,
  });
  const Device = IDL.Record({
    'id': IDL.Text,
    'serialNumber': IDL.Text,
    'deviceType': IDL.Text,
    'makeAndModel': IDL.Text,
    'companyName': IDL.Text,
    'amcTeam': IDL.Text,
    'amcStartDate': IDL.Int,
    'amcExpiryDate': IDL.Int,
    'assignedSeatId': IDL.Text,
    'sectionId': IDL.Text,
    'workingStatus': IDL.Text,
    'ipAddress': IDL.Text,
    'remarks': IDL.Text,
    'previousSection': IDL.Text,
    'dateMovedToStandby': IDL.Int,
    'createdAt': IDL.Int,
  });
  const Seat = IDL.Record({
    'id': IDL.Text,
    'sectionId': IDL.Text,
    'seatNumber': IDL.Text,
    'currentUser': IDL.Text,
    'cpuSerial': IDL.Text,
    'monitorSerial': IDL.Text,
    'ip1': IDL.Text,
    'ip2': IDL.Text,
    'remarks': IDL.Text,
    'createdAt': IDL.Int,
  });
  const StockImportRow = IDL.Record({
    'slNo' : IDL.Nat,
    'companyAndModel' : IDL.Text,
    'cpuSlNo' : IDL.Text,
    'monitorSlNo' : IDL.Text,
    'amcStartDate' : IDL.Int,
    'amcExpiryDate' : IDL.Int,
    'amcTeam' : IDL.Text,
  });
  return IDL.Service({
    '_caffeineStorageBlobIsLive' : IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Bool], ['query']),
    '_caffeineStorageBlobsToDelete' : IDL.Func([], [IDL.Vec(IDL.Vec(IDL.Nat8))], ['query']),
    '_caffeineStorageConfirmBlobDeletion' : IDL.Func([IDL.Vec(IDL.Vec(IDL.Nat8))], [], []),
    '_caffeineStorageCreateCertificate' : IDL.Func([IDL.Text], [_CaffeineStorageCreateCertificateResult], []),
    '_caffeineStorageRefillCashier' : IDL.Func([IDL.Opt(_CaffeineStorageRefillInformation)], [_CaffeineStorageRefillResult], []),
    '_caffeineStorageUpdateGatewayPrincipals' : IDL.Func([], [], []),
    'createSection' : IDL.Func([Section], [], []),
    'getAllSections' : IDL.Func([], [IDL.Vec(Section)], ['query']),
    'updateSection' : IDL.Func([Section], [], []),
    'deleteSection' : IDL.Func([IDL.Text], [], []),
    'createDevice' : IDL.Func([Device], [], []),
    'getDevice' : IDL.Func([IDL.Text], [IDL.Opt(Device)], ['query']),
    'getAllDevices' : IDL.Func([], [IDL.Vec(Device)], ['query']),
    'updateDevice' : IDL.Func([Device], [], []),
    'deleteDevice' : IDL.Func([IDL.Text], [], []),
    'createSeat' : IDL.Func([Seat], [], []),
    'getSeat' : IDL.Func([IDL.Text], [IDL.Opt(Seat)], ['query']),
    'getAllSeats' : IDL.Func([], [IDL.Vec(Seat)], ['query']),
    'updateSeat' : IDL.Func([Seat], [], []),
    'deleteSeat' : IDL.Func([IDL.Text], [], []),
    'importStockRow' : IDL.Func([StockImportRow], [], []),
    'createComplaint' : IDL.Func([Complaint], [], []),
    'getAllComplaints' : IDL.Func([], [IDL.Vec(Complaint)], ['query']),
    'updateComplaint' : IDL.Func([Complaint], [], []),
    'deleteComplaint' : IDL.Func([IDL.Text], [], []),
    'createMovementLog' : IDL.Func([MovementLog], [], []),
    'getAllMovementLogs' : IDL.Func([], [IDL.Vec(MovementLog)], ['query']),
    'getDashboardStats' : IDL.Func([], [IDL.Record({
      'totalSeats' : IDL.Nat,
      'totalStandbyDevices' : IDL.Nat,
      'pendingComplaints' : IDL.Nat,
      'clearedComplaints' : IDL.Nat,
      'totalOtherDevices' : IDL.Nat,
      'totalDevices' : IDL.Nat,
    })], ['query']),
    'clearAllData' : IDL.Func([], [], []),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
  });
};

export const init = ({ IDL }) => { return []; };
