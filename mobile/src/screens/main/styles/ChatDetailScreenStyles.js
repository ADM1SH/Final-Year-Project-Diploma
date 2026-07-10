import { StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../../utils/constants';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    zIndex: 10
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  messageList: { padding: 20, paddingBottom: 40 },
  messageBubble: { maxWidth: '80%', padding: 14, borderRadius: 18, marginBottom: 15 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 2 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: COLORS.lightGray, borderBottomLeftRadius: 2 },
  messageText: { fontSize: 15, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif' },
  myMessageText: { color: 'white' },
  theirMessageText: { color: COLORS.black },
  messageTime: { fontSize: 10, color: COLORS.gray, marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white
  },
  attachBtn: { marginRight: 10 },
  input: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif'
  },
  sendBtn: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center'
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 9
  },
  itemThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif'
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  soldBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  soldText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  makeOfferHeaderBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  makeOfferHeaderBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  presetsRow: {
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  presetChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1
  },
  presetChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  offerCard: {
    width: '75%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
  },
  myOfferCard: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  theirOfferCard: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  offerPriceText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  offerDivider: {
    height: 1,
    marginVertical: 8,
  },
  offerStatusContainer: {
    marginBottom: 4,
  },
  offerStatusText: {
    fontSize: 12,
  },
  offerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  offerBtn: {
    flex: 0.48,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  declineBtn: {
    backgroundColor: COLORS.danger,
  },
  offerBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  offerInputPanel: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 5,
  },
  offerInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerInputTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
  offerInputBody: {
    gap: 12,
  },
  offerMiniPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  offerPriceLabel: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
    marginRight: 6,
  },
  offerMiniInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  offerMethodSelector: {
    marginTop: 4,
  },
  methodTitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.gray + '40',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  activeMethodBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodBtnText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
  },
  activeMethodBtnText: {
    color: 'white',
  },
  sendOfferSubmitBtn: {
    backgroundColor: COLORS.secondary,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  sendOfferSubmitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  soldGuardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  soldGuardText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
});

export default styles;
