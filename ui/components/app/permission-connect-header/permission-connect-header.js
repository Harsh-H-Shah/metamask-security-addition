import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AlignItems,
  JustifyContent,
  TextColor,
  TextVariant,
  Display,
  BlockSize,
  FontWeight,
  FlexDirection,
  BackgroundColor,
} from '../../../helpers/constants/design-system';
import {
  IconSize,
  Text,
  Box,
  AvatarFavicon,
  AvatarBase,
} from '../../component-library';
import { getAvatarFallbackLetter } from '../../../helpers/utils/util';
import { Nav } from '../../../pages/confirmations/components/confirm/nav';

const PermissionConnectHeader = ({ requestId, subjectMetadata }) => {
  const [cachedSubjectMetadata, setCachedSubjectMetadata] =
    useState(subjectMetadata);

  // While this redirecting screen is showing, the subject metadata will become invalidated
  // for that reason we cache the last seen valid subject metadata and show that.
  useEffect(() => {
    if (subjectMetadata && subjectMetadata.origin) {
      setCachedSubjectMetadata(subjectMetadata);
    }
  }, [subjectMetadata]);

  const { iconUrl, origin, name } = cachedSubjectMetadata;
  return (
    <>
      <Nav confirmationId={requestId} />
      <Box
        backgroundColor={BackgroundColor.backgroundDefault}
        width={BlockSize.Full}
        alignItems={AlignItems.center}
        display={Display.Flex}
        padding={4}
        style={{
          boxShadow: 'var(--shadow-size-lg) var(--color-shadow-default)',
        }}
      >
        <Box>
          {iconUrl ? (
            <AvatarFavicon
              backgroundColor={BackgroundColor.backgroundAlternative}
              size={IconSize.Lg}
              src={iconUrl}
              name={name || origin}
            />
          ) : (
            <AvatarBase
              size={IconSize.Lg}
              display={Display.Flex}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
              color={TextColor.textAlternative}
              style={{ borderWidth: '0px' }}
              backgroundColor={BackgroundColor.backgroundAlternative}
            >
              {getAvatarFallbackLetter(name || origin)}
            </AvatarBase>
          )}
        </Box>
        <Box
          marginLeft={4}
          marginRight={4}
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          style={{ overflow: 'hidden' }}
        >
          <Text ellipsis fontWeight={FontWeight.Medium}>
            {origin}
          </Text>
          <Text
            ellipsis
            variant={TextVariant.bodySm}
            color={TextColor.textAlternative}
          >
            {origin}
          </Text>
        </Box>
      </Box>
    </>
  );
};

PermissionConnectHeader.propTypes = {
  requestId: PropTypes.string,
  subjectMetadata: {
    origin: PropTypes.string,
    iconUrl: PropTypes.string,
    name: PropTypes.string,
  },
};

export default PermissionConnectHeader;
